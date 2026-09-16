/**
 * Pure finance maths for 876 Projects.
 *
 * This module prices time entries, consumes budgets, and compares planned
 * against actual effort. It is deliberately free of I/O: no database, no
 * clock, no network. All money is integer minor units end to end; rates are
 * integer minor units per hour. The single permitted rounding is documented
 * on `amountMinorForMinutes`.
 *
 * A missing rate resolves to `null`, never zero. Callers must surface an
 * unpriced entry as unpriced rather than substituting zero.
 */

import { createHash } from 'node:crypto'

export type RateScope = 'project' | 'user' | 'project-user'

export type RateInput = {
  id: string
  scope: RateScope
  projectId: string | null
  userId: string | null
  billRateMinor: number
  costRateMinor: number
  effectiveFrom: number | null
  effectiveTo: number | null
}

export type RateKey = {
  projectId: string
  userId: string
  at: number
}

export function isRateEffectiveAt(rate: RateInput, at: number): boolean {
  if (rate.effectiveFrom !== null && at < rate.effectiveFrom) return false
  if (rate.effectiveTo !== null && at > rate.effectiveTo) return false
  return true
}

function latestEffective(candidates: RateInput[]): RateInput {
  let best = candidates[0] as RateInput
  let bestFrom = best.effectiveFrom ?? Number.NEGATIVE_INFINITY
  for (const candidate of candidates.slice(1)) {
    const from = candidate.effectiveFrom ?? Number.NEGATIVE_INFINITY
    if (from > bestFrom) {
      best = candidate
      bestFrom = from
    }
  }
  return best
}

/**
 * Resolves the rate for one entry in the documented order:
 * project-user rate, then user rate, then project rate, then none.
 * Within one tier the rate with the latest `effectiveFrom` wins; ties keep
 * array order so the result is deterministic. A missing rate yields `null`.
 */
export function resolveRate(
  rates: RateInput[],
  key: RateKey
): RateInput | null {
  const effective = rates.filter((rate) => isRateEffectiveAt(rate, key.at))
  const projectUser = effective.filter(
    (rate) =>
      rate.scope === 'project-user' &&
      rate.projectId === key.projectId &&
      rate.userId === key.userId
  )
  if (projectUser.length > 0) return latestEffective(projectUser)
  const user = effective.filter(
    (rate) => rate.scope === 'user' && rate.userId === key.userId
  )
  if (user.length > 0) return latestEffective(user)
  const project = effective.filter(
    (rate) => rate.scope === 'project' && rate.projectId === key.projectId
  )
  if (project.length > 0) return latestEffective(project)
  return null
}

/**
 * Resolves the project-scope rate used to price planned effort, which has no
 * user to resolve against. Returns `null` when no project rate is effective.
 */
export function resolveProjectRate(
  rates: RateInput[],
  projectId: string,
  at: number
): RateInput | null {
  const candidates = rates.filter(
    (rate) =>
      rate.scope === 'project' &&
      rate.projectId === projectId &&
      isRateEffectiveAt(rate, at)
  )
  if (candidates.length === 0) return null
  return latestEffective(candidates)
}

/**
 * Converts minutes at an hourly rate into integer minor units.
 *
 * Rounding rule: round half up at the minute-to-hour conversion, exactly
 * once, using integer maths — `floor((minutes * rateMinorPerHour + 30) / 60)`.
 * Totals are exact sums of per-entry amounts; no second rounding is applied.
 */
export function amountMinorForMinutes(
  minutes: number,
  rateMinorPerHour: number
): number {
  if (minutes <= 0) return 0
  return Math.floor((minutes * rateMinorPerHour + 30) / 60)
}

export type PricedEntryInput = {
  minutes: number
  billable: boolean
  projectId: string
  userId: string
  startedAt: number
}

export type PricedEntry = PricedEntryInput & {
  rateId: string | null
  costMinor: number | null
  revenueMinor: number | null
  unpriced: boolean
}

/**
 * Prices one entry. Revenue applies to billable entries only; cost applies
 * to every entry. Either figure is `null` when no rate resolves, and the
 * entry is flagged unpriced rather than priced at zero.
 */
export function priceEntry(
  entry: PricedEntryInput,
  rate: RateInput | null
): PricedEntry {
  if (!rate) {
    return {
      ...entry,
      rateId: null,
      costMinor: null,
      revenueMinor: null,
      unpriced: true,
    }
  }
  const costMinor = amountMinorForMinutes(entry.minutes, rate.costRateMinor)
  const revenueMinor = entry.billable
    ? amountMinorForMinutes(entry.minutes, rate.billRateMinor)
    : null
  return { ...entry, rateId: rate.id, costMinor, revenueMinor, unpriced: false }
}

export type PricedTotals = {
  entryCount: number
  pricedCount: number
  totalMinutes: number
  billableMinutes: number
  nonBillableMinutes: number
  costMinor: number
  revenueMinor: number
  unpricedMinutes: number
}

export function emptyPricedTotals(): PricedTotals {
  return {
    entryCount: 0,
    pricedCount: 0,
    totalMinutes: 0,
    billableMinutes: 0,
    nonBillableMinutes: 0,
    costMinor: 0,
    revenueMinor: 0,
    unpricedMinutes: 0,
  }
}

/**
 * Prices a mixed billable/non-billable set. Each entry resolves its own rate
 * and rounds exactly once; totals sum the per-entry amounts. Minutes whose
 * entry has no rate accumulate in `unpricedMinutes` instead of being valued
 * at zero.
 */
export function priceEntries(
  entries: PricedEntryInput[],
  rates: RateInput[]
): { priced: PricedEntry[]; totals: PricedTotals } {
  const totals = emptyPricedTotals()
  totals.entryCount = entries.length
  const priced = entries.map((entry) => {
    const rate = resolveRate(rates, {
      projectId: entry.projectId,
      userId: entry.userId,
      at: entry.startedAt,
    })
    const result = priceEntry(entry, rate)
    totals.totalMinutes += entry.minutes
    if (entry.billable) totals.billableMinutes += entry.minutes
    else totals.nonBillableMinutes += entry.minutes
    if (result.unpriced) {
      totals.unpricedMinutes += entry.minutes
    } else {
      totals.pricedCount += 1
      totals.costMinor += result.costMinor ?? 0
      totals.revenueMinor += result.revenueMinor ?? 0
    }
    return result
  })
  return { priced, totals }
}

export type BudgetConsumption = {
  spent: number
  budget: number
  percent: number
  overThreshold: boolean
  overBudget: boolean
  remaining: number
}

/**
 * Consumes a budget. `percent` is an integer from truncating integer
 * division (`floor(spent * 100 / budget)`), never a float; a zero budget
 * reports 0 when nothing is spent and 100 otherwise. `overThreshold` is
 * true at exactly the threshold percent. No rounding is applied here — the
 * module's single rounding lives in `amountMinorForMinutes`.
 */
export function budgetConsumption(
  spent: number,
  budget: number,
  thresholdPercent: number
): BudgetConsumption {
  const percent =
    budget > 0 ? Math.floor((spent * 100) / budget) : spent > 0 ? 100 : 0
  return {
    spent,
    budget,
    percent,
    overThreshold: percent >= thresholdPercent,
    overBudget: spent > budget,
    remaining: budget - spent,
  }
}

export type PlannedActual = {
  planned: number | null
  actual: number
  variance: number | null
}

/**
 * Compares a planned figure against its actual. A `null` plan (nothing to
 * compare against, e.g. no project rate to price planned effort) yields a
 * `null` variance rather than a fabricated zero plan.
 */
export function plannedVsActual(
  planned: number | null,
  actual: number
): PlannedActual {
  return {
    planned,
    actual,
    variance: planned === null ? null : actual - planned,
  }
}

/**
 * Builds the idempotency key for an invoice draft from the tenant, project,
 * period, and the sorted entry id set, so re-running the same draft derives
 * the same key. Sorting keeps the key independent of row order.
 */
export function buildInvoiceIdempotencyKey(
  tenantId: string,
  projectId: string,
  from: number,
  to: number,
  entryIds: string[]
): string {
  const canonical = JSON.stringify([
    tenantId,
    projectId,
    from,
    to,
    [...entryIds].sort(),
  ])
  return createHash('sha256').update(canonical, 'utf8').digest('hex')
}
