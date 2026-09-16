import {
  create876BillingServiceClient,
  type BillingInvoiceCreateParams,
} from '@876/billing/service'
import { getError, type ProjectsError } from '../../http/errors.js'
import { generateId } from '../../platform/ids.js'
import {
  nowUnixSeconds,
  nullableToDbUnixSeconds,
  toDbUnixSeconds,
} from '../../platform/timestamps.js'
import * as projects from '../projects/index.js'
import * as tenants from '../tenants/index.js'
import {
  amountMinorForMinutes,
  budgetConsumption,
  buildInvoiceIdempotencyKey,
  plannedVsActual,
  priceEntries,
  resolveProjectRate,
  resolveRate,
  type PricedEntryInput,
  type RateInput,
} from './finance.calculations.js'
import * as repository from './finance.repository.js'
import type {
  CreateBudgetBody,
  CreateInvoiceDraftBody,
  CreateRateBody,
  FinancialSummaryQuery,
  PutBillingBody,
  UpdateBudgetBody,
  UpdateRateBody,
} from './finance.schemas.js'
import {
  serializeBudget,
  serializeMoneyPlannedActual,
  serializeProjectBilling,
  serializeRate,
  type BudgetRow,
  type RateRow,
  type SerializedBudget,
  type SerializedBudgetConsumption,
  type SerializedFinancialSummary,
  type SerializedInvoiceDraft,
  type SerializedProjectBilling,
  type SerializedRate,
} from './finance.serializers.js'

export type ServiceResult<T> =
  { data: T; error: null } | { data: null; error: ProjectsError }

type TenantResolution =
  | { tenant: { id: string }; error: null }
  | { tenant: null; error: ProjectsError }

async function resolveTenant(organizationId: string): Promise<TenantResolution> {
  const tenant = await tenants.resolveTenant(organizationId)
  if (!tenant)
    return { tenant: null, error: getError('projects/tenant-not-found') }
  return { tenant, error: null }
}

function billing() {
  return create876BillingServiceClient({
    baseUrl: process.env.BILLING_API_URL,
    apiKey: process.env.PROJECTS_API_876_KEY,
  })
}

function toRateInput(row: RateRow): RateInput {
  return {
    id: row.id,
    scope: row.scope as RateInput['scope'],
    projectId: row.projectId,
    userId: row.userId,
    billRateMinor: row.billRateMinor,
    costRateMinor: row.costRateMinor,
    effectiveFrom:
      row.effectiveFrom === null || row.effectiveFrom === undefined
        ? null
        : Number(row.effectiveFrom),
    effectiveTo:
      row.effectiveTo === null || row.effectiveTo === undefined
        ? null
        : Number(row.effectiveTo),
  }
}

function budgetInProject(budget: BudgetRow, projectId: string): boolean {
  return budget.projectId === projectId
}

function rateVisibleInProject(rate: RateRow, projectId: string): boolean {
  if (rate.scope === 'user') return rate.projectId === null
  return rate.projectId === projectId
}

function checkMergedBudget(
  scope: string,
  milestoneId: string | null,
  userId: string | null,
  amountMinor: number | null,
  hours: number | null
): ProjectsError | null {
  if ((amountMinor !== null) === (hours !== null))
    return getError('projects/invalid-request', {
      description: 'Exactly one of amountMinor or hours must be set.',
    })
  if (scope === 'milestone' && milestoneId === null)
    return getError('projects/invalid-request', {
      param: 'milestoneId',
      description: 'milestoneId is required when scope is milestone.',
    })
  if (scope !== 'milestone' && milestoneId !== null)
    return getError('projects/invalid-request', {
      param: 'milestoneId',
      description: 'milestoneId is only allowed when scope is milestone.',
    })
  if (scope === 'user' && userId === null)
    return getError('projects/invalid-request', {
      param: 'userId',
      description: 'userId is required when scope is user.',
    })
  if (scope !== 'user' && userId !== null)
    return getError('projects/invalid-request', {
      param: 'userId',
      description: 'userId is only allowed when scope is user.',
    })
  return null
}

export async function getBilling(
  organizationId: string,
  projectIdOrKey: string
): Promise<ServiceResult<SerializedProjectBilling>> {
  const resolved = await resolveTenant(organizationId)
  if (resolved.error || !resolved.tenant)
    return { data: null, error: resolved.error }
  const project = await projects.resolveProject(
    resolved.tenant.id,
    projectIdOrKey
  )
  if (!project)
    return { data: null, error: getError('projects/project-not-found') }
  const row = await repository.retrieveBilling(resolved.tenant.id, project.id)
  if (!row)
    return {
      data: null,
      error: getError('projects/billing-config-not-found'),
    }
  return { data: serializeProjectBilling(row), error: null }
}

export async function putBilling(
  organizationId: string,
  projectIdOrKey: string,
  body: PutBillingBody
): Promise<ServiceResult<SerializedProjectBilling>> {
  const resolved = await resolveTenant(organizationId)
  if (resolved.error || !resolved.tenant)
    return { data: null, error: resolved.error }
  const project = await projects.resolveProject(
    resolved.tenant.id,
    projectIdOrKey
  )
  if (!project)
    return { data: null, error: getError('projects/project-not-found') }
  const now = toDbUnixSeconds(nowUnixSeconds())
  const row = await repository.upsertBilling({
    id: generateId('projectBilling'),
    tenantId: resolved.tenant.id,
    projectId: project.id,
    billingMethod: body.billingMethod,
    currency: body.currency ?? 'USD',
    billingCustomerId: body.billingCustomerId ?? null,
    fixedFeeAmount: body.fixedFeeAmount ?? null,
    createdAt: now,
    updatedAt: now,
  })
  return { data: serializeProjectBilling(row), error: null }
}

export async function listBudgets(
  organizationId: string,
  projectIdOrKey: string
): Promise<ServiceResult<SerializedBudget[]>> {
  const resolved = await resolveTenant(organizationId)
  if (resolved.error || !resolved.tenant)
    return { data: null, error: resolved.error }
  const project = await projects.resolveProject(
    resolved.tenant.id,
    projectIdOrKey
  )
  if (!project)
    return { data: null, error: getError('projects/project-not-found') }
  const rows = await repository.listBudgets(resolved.tenant.id, project.id)
  return { data: rows.map(serializeBudget), error: null }
}

export async function createBudget(
  organizationId: string,
  projectIdOrKey: string,
  body: CreateBudgetBody
): Promise<ServiceResult<SerializedBudget>> {
  const resolved = await resolveTenant(organizationId)
  if (resolved.error || !resolved.tenant)
    return { data: null, error: resolved.error }
  const project = await projects.resolveProject(
    resolved.tenant.id,
    projectIdOrKey
  )
  if (!project)
    return { data: null, error: getError('projects/project-not-found') }
  const now = toDbUnixSeconds(nowUnixSeconds())
  const row = await repository.createBudget({
    id: generateId('budget'),
    tenantId: resolved.tenant.id,
    projectId: project.id,
    scope: body.scope,
    milestoneId: body.milestoneId ?? null,
    userId: body.userId ?? null,
    amountMinor: body.amountMinor ?? null,
    hours: body.hours ?? null,
    thresholdPercent: body.thresholdPercent,
    periodStart: nullableToDbUnixSeconds(body.periodStart),
    periodEnd: nullableToDbUnixSeconds(body.periodEnd),
    createdAt: now,
    updatedAt: now,
  })
  return { data: serializeBudget(row), error: null }
}

export async function retrieveBudget(
  organizationId: string,
  projectIdOrKey: string,
  budgetId: string
): Promise<ServiceResult<SerializedBudget>> {
  const resolved = await resolveTenant(organizationId)
  if (resolved.error || !resolved.tenant)
    return { data: null, error: resolved.error }
  const project = await projects.resolveProject(
    resolved.tenant.id,
    projectIdOrKey
  )
  if (!project)
    return { data: null, error: getError('projects/project-not-found') }
  const row = await repository.retrieveBudget(resolved.tenant.id, budgetId)
  if (!row || !budgetInProject(row, project.id))
    return { data: null, error: getError('projects/budget-not-found') }
  return { data: serializeBudget(row), error: null }
}

export async function updateBudget(
  organizationId: string,
  projectIdOrKey: string,
  budgetId: string,
  body: UpdateBudgetBody
): Promise<ServiceResult<SerializedBudget>> {
  const resolved = await resolveTenant(organizationId)
  if (resolved.error || !resolved.tenant)
    return { data: null, error: resolved.error }
  const project = await projects.resolveProject(
    resolved.tenant.id,
    projectIdOrKey
  )
  if (!project)
    return { data: null, error: getError('projects/project-not-found') }
  const existing = await repository.retrieveBudget(
    resolved.tenant.id,
    budgetId
  )
  if (!existing || !budgetInProject(existing, project.id))
    return { data: null, error: getError('projects/budget-not-found') }
  const merged = {
    amountMinor:
      body.amountMinor === undefined ? existing.amountMinor : body.amountMinor,
    hours: body.hours === undefined ? existing.hours : body.hours,
    milestoneId:
      body.milestoneId === undefined
        ? existing.milestoneId
        : body.milestoneId,
    userId: body.userId === undefined ? existing.userId : body.userId,
  }
  const invalid = checkMergedBudget(
    existing.scope,
    merged.milestoneId,
    merged.userId,
    merged.amountMinor,
    merged.hours
  )
  if (invalid) return { data: null, error: invalid }
  const row = await repository.updateBudget(budgetId, {
    ...(body.amountMinor === undefined
      ? {}
      : { amountMinor: body.amountMinor }),
    ...(body.hours === undefined ? {} : { hours: body.hours }),
    ...(body.thresholdPercent === undefined
      ? {}
      : { thresholdPercent: body.thresholdPercent }),
    ...(body.periodStart === undefined
      ? {}
      : { periodStart: nullableToDbUnixSeconds(body.periodStart) }),
    ...(body.periodEnd === undefined
      ? {}
      : { periodEnd: nullableToDbUnixSeconds(body.periodEnd) }),
    ...(body.milestoneId === undefined
      ? {}
      : { milestoneId: body.milestoneId }),
    ...(body.userId === undefined ? {} : { userId: body.userId }),
    updatedAt: toDbUnixSeconds(nowUnixSeconds()),
  })
  return { data: serializeBudget(row), error: null }
}

export async function removeBudget(
  organizationId: string,
  projectIdOrKey: string,
  budgetId: string
): Promise<ServiceResult<{ object: 'projects.budget'; id: string; deleted: true }>> {
  const resolved = await resolveTenant(organizationId)
  if (resolved.error || !resolved.tenant)
    return { data: null, error: resolved.error }
  const project = await projects.resolveProject(
    resolved.tenant.id,
    projectIdOrKey
  )
  if (!project)
    return { data: null, error: getError('projects/project-not-found') }
  const existing = await repository.retrieveBudget(
    resolved.tenant.id,
    budgetId
  )
  if (!existing || !budgetInProject(existing, project.id))
    return { data: null, error: getError('projects/budget-not-found') }
  await repository.deleteBudget(resolved.tenant.id, budgetId)
  return {
    data: { object: 'projects.budget', id: budgetId, deleted: true },
    error: null,
  }
}

export async function listRates(
  organizationId: string,
  projectIdOrKey: string
): Promise<ServiceResult<SerializedRate[]>> {
  const resolved = await resolveTenant(organizationId)
  if (resolved.error || !resolved.tenant)
    return { data: null, error: resolved.error }
  const project = await projects.resolveProject(
    resolved.tenant.id,
    projectIdOrKey
  )
  if (!project)
    return { data: null, error: getError('projects/project-not-found') }
  const rows = await repository.listRates(resolved.tenant.id, project.id)
  return { data: rows.map(serializeRate), error: null }
}

export async function createRate(
  organizationId: string,
  projectIdOrKey: string,
  body: CreateRateBody
): Promise<ServiceResult<SerializedRate>> {
  const resolved = await resolveTenant(organizationId)
  if (resolved.error || !resolved.tenant)
    return { data: null, error: resolved.error }
  const project = await projects.resolveProject(
    resolved.tenant.id,
    projectIdOrKey
  )
  if (!project)
    return { data: null, error: getError('projects/project-not-found') }
  const now = toDbUnixSeconds(nowUnixSeconds())
  const row = await repository.createRate({
    id: generateId('rate'),
    tenantId: resolved.tenant.id,
    projectId: body.scope === 'user' ? null : project.id,
    userId: body.scope === 'project' ? null : (body.userId ?? null),
    scope: body.scope,
    billRateMinor: body.billRateMinor,
    costRateMinor: body.costRateMinor,
    currency: body.currency,
    effectiveFrom: nullableToDbUnixSeconds(body.effectiveFrom),
    effectiveTo: nullableToDbUnixSeconds(body.effectiveTo),
    createdAt: now,
    updatedAt: now,
  })
  return { data: serializeRate(row), error: null }
}

export async function retrieveRate(
  organizationId: string,
  projectIdOrKey: string,
  rateId: string
): Promise<ServiceResult<SerializedRate>> {
  const resolved = await resolveTenant(organizationId)
  if (resolved.error || !resolved.tenant)
    return { data: null, error: resolved.error }
  const project = await projects.resolveProject(
    resolved.tenant.id,
    projectIdOrKey
  )
  if (!project)
    return { data: null, error: getError('projects/project-not-found') }
  const row = await repository.retrieveRate(resolved.tenant.id, rateId)
  if (!row || !rateVisibleInProject(row, project.id))
    return { data: null, error: getError('projects/rate-not-found') }
  return { data: serializeRate(row), error: null }
}

export async function updateRate(
  organizationId: string,
  projectIdOrKey: string,
  rateId: string,
  body: UpdateRateBody
): Promise<ServiceResult<SerializedRate>> {
  const resolved = await resolveTenant(organizationId)
  if (resolved.error || !resolved.tenant)
    return { data: null, error: resolved.error }
  const project = await projects.resolveProject(
    resolved.tenant.id,
    projectIdOrKey
  )
  if (!project)
    return { data: null, error: getError('projects/project-not-found') }
  const existing = await repository.retrieveRate(resolved.tenant.id, rateId)
  if (!existing || !rateVisibleInProject(existing, project.id))
    return { data: null, error: getError('projects/rate-not-found') }
  if (
    body.userId !== undefined &&
    existing.scope === 'project' &&
    body.userId !== null
  )
    return {
      data: null,
      error: getError('projects/invalid-request', {
        param: 'userId',
        description: 'userId is only allowed when scope is not project.',
      }),
    }
  const row = await repository.updateRate(rateId, {
    ...(body.userId === undefined ? {} : { userId: body.userId }),
    ...(body.billRateMinor === undefined
      ? {}
      : { billRateMinor: body.billRateMinor }),
    ...(body.costRateMinor === undefined
      ? {}
      : { costRateMinor: body.costRateMinor }),
    ...(body.currency === undefined ? {} : { currency: body.currency }),
    ...(body.effectiveFrom === undefined
      ? {}
      : { effectiveFrom: nullableToDbUnixSeconds(body.effectiveFrom) }),
    ...(body.effectiveTo === undefined
      ? {}
      : { effectiveTo: nullableToDbUnixSeconds(body.effectiveTo) }),
    updatedAt: toDbUnixSeconds(nowUnixSeconds()),
  })
  return { data: serializeRate(row), error: null }
}

export async function removeRate(
  organizationId: string,
  projectIdOrKey: string,
  rateId: string
): Promise<ServiceResult<{ object: 'projects.rate'; id: string; deleted: true }>> {
  const resolved = await resolveTenant(organizationId)
  if (resolved.error || !resolved.tenant)
    return { data: null, error: resolved.error }
  const project = await projects.resolveProject(
    resolved.tenant.id,
    projectIdOrKey
  )
  if (!project)
    return { data: null, error: getError('projects/project-not-found') }
  const existing = await repository.retrieveRate(resolved.tenant.id, rateId)
  if (!existing || !rateVisibleInProject(existing, project.id))
    return { data: null, error: getError('projects/rate-not-found') }
  await repository.deleteRate(resolved.tenant.id, rateId)
  return {
    data: { object: 'projects.rate', id: rateId, deleted: true },
    error: null,
  }
}

function entryInputFor(
  projectId: string,
  row: {
    userId: string
    startedAt: bigint
    durationMinutes: number | null
    billable: boolean
  }
): PricedEntryInput | null {
  if (row.durationMinutes === null || row.durationMinutes === undefined)
    return null
  return {
    minutes: row.durationMinutes,
    billable: row.billable,
    projectId,
    userId: row.userId,
    startedAt: Number(row.startedAt),
  }
}

export async function getFinancialSummary(
  organizationId: string,
  projectIdOrKey: string,
  query: FinancialSummaryQuery
): Promise<ServiceResult<SerializedFinancialSummary>> {
  const resolved = await resolveTenant(organizationId)
  if (resolved.error || !resolved.tenant)
    return { data: null, error: resolved.error }
  const project = await projects.resolveProject(
    resolved.tenant.id,
    projectIdOrKey
  )
  if (!project)
    return { data: null, error: getError('projects/project-not-found') }

  const fromDb = toDbUnixSeconds(query.from)
  const toDb = toDbUnixSeconds(query.to)
  const [entries, rateRows, budgetRows, plannedIssues] = await Promise.all([
    repository.listSummaryEntries(resolved.tenant.id, project.id, fromDb, toDb),
    repository.listRates(resolved.tenant.id, project.id),
    repository.listBudgets(resolved.tenant.id, project.id),
    repository.listPlannedIssues(resolved.tenant.id, project.id),
  ])
  const rates = rateRows.map(toRateInput)

  const pricedInputs: PricedEntryInput[] = []
  for (const entry of entries) {
    const input = entryInputFor(project.id, entry)
    if (input) pricedInputs.push(input)
  }
  const { totals } = priceEntries(pricedInputs, rates)

  const plannedMinutes = plannedIssues.reduce(
    (sum, issue) => sum + (issue.plannedDurationMinutes ?? 0),
    0
  )
  const projectRate = resolveProjectRate(rates, project.id, query.to)
  const plannedCostMinor = projectRate
    ? amountMinorForMinutes(plannedMinutes, projectRate.costRateMinor)
    : null
  const plannedRevenueMinor = projectRate
    ? amountMinorForMinutes(plannedMinutes, projectRate.billRateMinor)
    : null

  const budgets: SerializedBudgetConsumption[] = budgetRows.map((budget) =>
    consumeBudget(budget, entries, rates)
  )

  return {
    data: {
      object: 'projects.financial-summary',
      tenantId: resolved.tenant.id,
      projectId: project.id,
      from: query.from,
      to: query.to,
      minutes: {
        plannedMinutes,
        actualMinutes: totals.totalMinutes,
        varianceMinutes: totals.totalMinutes - plannedMinutes,
      },
      cost: serializeMoneyPlannedActual(
        plannedVsActual(plannedCostMinor, totals.costMinor)
      ),
      revenue: serializeMoneyPlannedActual(
        plannedVsActual(plannedRevenueMinor, totals.revenueMinor)
      ),
      unpricedMinutes: totals.unpricedMinutes,
      budgets,
    },
    error: null,
  }
}

function matchScopedEntry(
  entry: { milestoneId: string | null; userId: string },
  budget: BudgetRow
): boolean {
  if (budget.scope === 'milestone') return entry.milestoneId === budget.milestoneId
  if (budget.scope === 'user') return entry.userId === budget.userId
  return true
}

function consumeBudget(
  budget: BudgetRow,
  entries: Array<{
    milestoneId: string | null
    userId: string
    durationMinutes: number | null
    billable: boolean
    projectId: string
    startedAt: bigint
  }>,
  rates: RateInput[]
): SerializedBudgetConsumption {
  const inputs: PricedEntryInput[] = []
  for (const entry of entries) {
    if (entry.durationMinutes === null || entry.durationMinutes === undefined)
      continue
    if (!matchScopedEntry(entry, budget)) continue
    inputs.push({
      minutes: entry.durationMinutes,
      billable: entry.billable,
      projectId: entry.projectId,
      userId: entry.userId,
      startedAt: Number(entry.startedAt),
    })
  }
  const { totals } = priceEntries(inputs, rates)
  if (budget.amountMinor !== null && budget.amountMinor !== undefined) {
    const consumption = budgetConsumption(
      totals.costMinor,
      budget.amountMinor,
      budget.thresholdPercent
    )
    return {
      budgetId: budget.id,
      scope: budget.scope,
      kind: 'amount',
      ...consumption,
    }
  }
  const budgetMinutes = (budget.hours as number) * 60
  const consumption = budgetConsumption(
    totals.totalMinutes,
    budgetMinutes,
    budget.thresholdPercent
  )
  return {
    budgetId: budget.id,
    scope: budget.scope,
    kind: 'hours',
    ...consumption,
  }
}

export async function createInvoiceDraft(
  organizationId: string,
  projectIdOrKey: string,
  body: CreateInvoiceDraftBody
): Promise<ServiceResult<SerializedInvoiceDraft>> {
  const resolved = await resolveTenant(organizationId)
  if (resolved.error || !resolved.tenant)
    return { data: null, error: resolved.error }
  const project = await projects.resolveProject(
    resolved.tenant.id,
    projectIdOrKey
  )
  if (!project)
    return { data: null, error: getError('projects/project-not-found') }
  const config = await repository.retrieveBilling(
    resolved.tenant.id,
    project.id
  )
  if (!config)
    return {
      data: null,
      error: getError('projects/billing-config-not-found'),
    }
  if (!config.billingCustomerId)
    return {
      data: null,
      error: getError('projects/invoice-customer-missing'),
    }

  const fromDb = toDbUnixSeconds(body.from)
  const toDb = toDbUnixSeconds(body.to)
  const [periodEntries, rateRows] = await Promise.all([
    repository.listPeriodBillableEntries(
      resolved.tenant.id,
      project.id,
      fromDb,
      toDb
    ),
    repository.listRates(resolved.tenant.id, project.id),
  ])
  const rates = rateRows.map(toRateInput)
  const qualifiable = periodEntries.filter(
    (entry) =>
      entry.approvalStatus === 'approved' &&
      entry.billable &&
      entry.durationMinutes !== null &&
      entry.durationMinutes !== undefined
  )
  const idempotencyKey = buildInvoiceIdempotencyKey(
    resolved.tenant.id,
    project.id,
    body.from,
    body.to,
    qualifiable.map((entry) => entry.id)
  )
  const unbilled = qualifiable.filter(
    (entry) => entry.billedInvoiceId === null
  )
  if (unbilled.length === 0) {
    const billedIds = qualifiable
      .map((entry) => entry.billedInvoiceId as string)
      .filter((value) => value !== null)
    const distinct = [...new Set(billedIds)]
    if (distinct.length === 1 && qualifiable.length > 0) {
      const invoiceId = distinct[0] as string
      return {
        data: {
          object: 'projects.invoice-draft',
          invoiceId,
          tenantId: resolved.tenant.id,
          projectId: project.id,
          from: body.from,
          to: body.to,
          idempotencyKey,
          billedEntryIds: [],
          billedCount: 0,
          billedAmountMinor: 0,
        },
        error: null,
      }
    }
    if (distinct.length > 1)
      return {
        data: null,
        error: getError('projects/entries-already-billed'),
      }
    return { data: null, error: getError('projects/nothing-to-invoice') }
  }

  const unpriced = unbilled.filter(
    (entry) =>
      resolveRate(rates, {
        projectId: project.id,
        userId: entry.userId,
        at: Number(entry.startedAt),
      }) === null
  )
  if (unpriced.length > 0)
    return {
      data: null,
      error: getError('projects/invoice-has-unpriced-entries', {
        description: `Entries without a matching rate: ${unpriced.map((entry) => entry.id).join(', ')}`,
      }),
    }

  const lines: BillingInvoiceCreateParams['lines'] = []
  let billedAmountMinor = 0
  for (const entry of unbilled) {
    const rate = resolveRate(rates, {
      projectId: project.id,
      userId: entry.userId,
      at: Number(entry.startedAt),
    }) as RateInput
    const minutes = entry.durationMinutes as number
    const amount = amountMinorForMinutes(minutes, rate.billRateMinor)
    billedAmountMinor += amount
    lines.push({
      description: `Project ${project.key} time entry ${entry.id} (${minutes} min)`,
      quantity: 1,
      unitAmount: amount,
    })
  }

  const created = await billing().invoices.create(
    organizationId,
    {
      customerId: config.billingCustomerId,
      currency: config.currency,
      subject: `Project ${project.key} time ${body.from}-${body.to}`,
      sourceExternalReference: `projects/${project.id}/${body.from}/${body.to}`,
      lines,
    },
    { idempotencyKey }
  )
  if (created.error || !created.data)
    return {
      data: null,
      error: getError('projects/billing-unavailable', {
        description: created.error
          ? `${created.error.code}: ${created.error.message}`
          : 'The billing service returned no invoice.',
      }),
    }

  const invoiceId = created.data.id
  await repository.markEntriesBilled(
    resolved.tenant.id,
    unbilled.map((entry) => entry.id),
    invoiceId,
    toDbUnixSeconds(nowUnixSeconds())
  )
  return {
    data: {
      object: 'projects.invoice-draft',
      invoiceId,
      tenantId: resolved.tenant.id,
      projectId: project.id,
      from: body.from,
      to: body.to,
      idempotencyKey,
      billedEntryIds: unbilled.map((entry) => entry.id),
      billedCount: unbilled.length,
      billedAmountMinor,
    },
    error: null,
  }
}
