import { describe, expect, it } from 'vitest'

import {
  amountMinorForMinutes,
  budgetConsumption,
  buildInvoiceIdempotencyKey,
  plannedVsActual,
  priceEntries,
  priceEntry,
  resolveProjectRate,
  resolveRate,
  type RateInput,
} from '../finance.calculations.js'

function rate(overrides: Partial<RateInput> = {}): RateInput {
  return {
    id: 'rte_1',
    scope: 'project',
    projectId: 'prj_1',
    userId: null,
    billRateMinor: 6000,
    costRateMinor: 3000,
    effectiveFrom: null,
    effectiveTo: null,
    ...overrides,
  }
}

describe('resolveRate order', () => {
  const key = { projectId: 'prj_1', userId: 'usr_1', at: 1000 }

  it('prefers the project-user rate over user and project rates', () => {
    const projectUser = rate({ id: 'rte_pu', scope: 'project-user', userId: 'usr_1' })
    const user = rate({ id: 'rte_u', scope: 'user', projectId: null, userId: 'usr_1' })
    const project = rate({ id: 'rte_p' })
    expect(resolveRate([project, user, projectUser], key)?.id).toBe('rte_pu')
  })

  it('prefers the user rate over the project rate', () => {
    const user = rate({ id: 'rte_u', scope: 'user', projectId: null, userId: 'usr_1' })
    const project = rate({ id: 'rte_p' })
    expect(resolveRate([project, user], key)?.id).toBe('rte_u')
  })

  it('falls back to the project rate', () => {
    expect(resolveRate([rate({ id: 'rte_p' })], key)?.id).toBe('rte_p')
  })

  it('returns null when no rate matches', () => {
    expect(resolveRate([], key)).toBeNull()
    expect(
      resolveRate([rate({ projectId: 'prj_other' })], key)
    ).toBeNull()
  })

  it('ignores rates that start after the entry', () => {
    const future = rate({ id: 'rte_future', effectiveFrom: 2000 })
    expect(resolveRate([future], key)).toBeNull()
  })

  it('ignores rates that ended before the entry', () => {
    const past = rate({ id: 'rte_past', effectiveTo: 500 })
    expect(resolveRate([past], key)).toBeNull()
  })

  it('treats unbounded rates as always effective', () => {
    const unbounded = rate({ id: 'rte_open' })
    expect(resolveRate([unbounded], key)?.id).toBe('rte_open')
  })

  it('treats the effective range as inclusive on both ends', () => {
    const edge = rate({ id: 'rte_edge', effectiveFrom: 1000, effectiveTo: 1000 })
    expect(resolveRate([edge], key)?.id).toBe('rte_edge')
  })

  it('picks the latest effectiveFrom within one tier', () => {
    const older = rate({ id: 'rte_old', effectiveFrom: 100 })
    const newer = rate({ id: 'rte_new', effectiveFrom: 900 })
    expect(resolveRate([older, newer], key)?.id).toBe('rte_new')
    expect(resolveRate([newer, older], key)?.id).toBe('rte_new')
  })

  it('does not match another project or user', () => {
    const otherProject = rate({
      id: 'rte_op',
      scope: 'project-user',
      projectId: 'prj_2',
      userId: 'usr_1',
    })
    const otherUser = rate({
      id: 'rte_ou',
      scope: 'project-user',
      projectId: 'prj_1',
      userId: 'usr_2',
    })
    expect(resolveRate([otherProject, otherUser], key)).toBeNull()
  })

  it('resolves the project rate for planned effort', () => {
    const project = rate({ id: 'rte_p' })
    expect(resolveProjectRate([project], 'prj_1', 1000)?.id).toBe('rte_p')
  })

  it('returns null for planned effort without a project rate', () => {
    const user = rate({ id: 'rte_u', scope: 'user', projectId: null, userId: 'usr_1' })
    expect(resolveProjectRate([user], 'prj_1', 1000)).toBeNull()
    expect(resolveProjectRate([], 'prj_1', 1000)).toBeNull()
  })
})

describe('amountMinorForMinutes rounding', () => {
  it('prices an exact hour without remainder', () => {
    expect(amountMinorForMinutes(60, 6000)).toBe(6000)
  })

  it('rounds half up at the minute-to-hour conversion', () => {
    expect(amountMinorForMinutes(30, 6001)).toBe(3001)
  })

  it('rounds down below one half', () => {
    expect(amountMinorForMinutes(1, 6000)).toBe(100)
    expect(amountMinorForMinutes(1, 3000)).toBe(50)
  })

  it('returns zero for zero or negative minutes', () => {
    expect(amountMinorForMinutes(0, 6000)).toBe(0)
    expect(amountMinorForMinutes(-5, 6000)).toBe(0)
  })

  it('prices a zero rate as zero without treating it as missing', () => {
    expect(amountMinorForMinutes(60, 0)).toBe(0)
  })
})

describe('priceEntry', () => {
  it('prices cost and revenue for a billable entry', () => {
    const priced = priceEntry(
      { minutes: 60, billable: true, projectId: 'prj_1', userId: 'usr_1', startedAt: 1000 },
      rate()
    )
    expect(priced).toMatchObject({
      costMinor: 3000,
      revenueMinor: 6000,
      unpriced: false,
      rateId: 'rte_1',
    })
  })

  it('prices cost but leaves revenue null for non-billable entries', () => {
    const priced = priceEntry(
      { minutes: 60, billable: false, projectId: 'prj_1', userId: 'usr_1', startedAt: 1000 },
      rate()
    )
    expect(priced.costMinor).toBe(3000)
    expect(priced.revenueMinor).toBeNull()
    expect(priced.unpriced).toBe(false)
  })

  it('marks entries without a rate as unpriced instead of zero', () => {
    const priced = priceEntry(
      { minutes: 60, billable: true, projectId: 'prj_1', userId: 'usr_1', startedAt: 1000 },
      null
    )
    expect(priced.costMinor).toBeNull()
    expect(priced.revenueMinor).toBeNull()
    expect(priced.unpriced).toBe(true)
  })
})

describe('priceEntries mixed sets', () => {
  const rates = [rate()]

  it('charges cost for every entry but revenue for billable entries only', () => {
    const { totals } = priceEntries(
      [
        { minutes: 60, billable: true, projectId: 'prj_1', userId: 'usr_1', startedAt: 1000 },
        { minutes: 30, billable: false, projectId: 'prj_1', userId: 'usr_1', startedAt: 1000 },
      ],
      rates
    )
    expect(totals.totalMinutes).toBe(90)
    expect(totals.billableMinutes).toBe(60)
    expect(totals.nonBillableMinutes).toBe(30)
    expect(totals.costMinor).toBe(4500)
    expect(totals.revenueMinor).toBe(6000)
  })

  it('accumulates unpriced minutes instead of valuing them at zero', () => {
    const { totals } = priceEntries(
      [
        { minutes: 60, billable: true, projectId: 'prj_1', userId: 'usr_1', startedAt: 1000 },
        { minutes: 45, billable: true, projectId: 'prj_9', userId: 'usr_9', startedAt: 1000 },
      ],
      rates
    )
    expect(totals.unpricedMinutes).toBe(45)
    expect(totals.costMinor).toBe(3000)
    expect(totals.revenueMinor).toBe(6000)
    expect(totals.pricedCount).toBe(1)
    expect(totals.entryCount).toBe(2)
  })

  it('rounds once per entry and sums without further rounding', () => {
    const { totals } = priceEntries(
      [
        { minutes: 30, billable: true, projectId: 'prj_1', userId: 'usr_1', startedAt: 1000 },
        { minutes: 30, billable: true, projectId: 'prj_1', userId: 'usr_1', startedAt: 1000 },
      ],
      [rate({ billRateMinor: 6001, costRateMinor: 6001 })]
    )
    expect(totals.revenueMinor).toBe(6002)
  })
})

describe('budgetConsumption', () => {
  it('reports an integer percent from truncating division', () => {
    expect(budgetConsumption(199, 200, 80)).toMatchObject({
      spent: 199,
      budget: 200,
      percent: 99,
      overThreshold: true,
      overBudget: false,
      remaining: 1,
    })
  })

  it('crosses the threshold at exactly the percent', () => {
    expect(budgetConsumption(80, 100, 80).overThreshold).toBe(true)
    expect(budgetConsumption(79, 100, 80).overThreshold).toBe(false)
  })

  it('flags over-budget spend above one hundred percent', () => {
    expect(budgetConsumption(120, 100, 80)).toMatchObject({
      percent: 120,
      overThreshold: true,
      overBudget: true,
      remaining: -20,
    })
  })

  it('reports zero percent for an untouched zero budget', () => {
    expect(budgetConsumption(0, 0, 80)).toMatchObject({
      percent: 0,
      overThreshold: false,
      overBudget: false,
    })
  })

  it('flags spend against a zero budget as over budget', () => {
    expect(budgetConsumption(10, 0, 80)).toMatchObject({
      percent: 100,
      overBudget: true,
    })
  })
})

describe('plannedVsActual', () => {
  it('computes a signed variance', () => {
    expect(plannedVsActual(60, 90)).toEqual({ planned: 60, actual: 90, variance: 30 })
    expect(plannedVsActual(60, 40)).toEqual({ planned: 60, actual: 40, variance: -20 })
  })

  it('leaves variance null when there is no plan', () => {
    expect(plannedVsActual(null, 40)).toEqual({ planned: null, actual: 40, variance: null })
  })
})

describe('buildInvoiceIdempotencyKey', () => {
  it('is stable regardless of entry order', () => {
    const first = buildInvoiceIdempotencyKey('ten_1', 'prj_1', 1, 2, ['tme_b', 'tme_a'])
    const second = buildInvoiceIdempotencyKey('ten_1', 'prj_1', 1, 2, ['tme_a', 'tme_b'])
    expect(first).toBe(second)
  })

  it('changes when the entry set, period, or scope changes', () => {
    const base = buildInvoiceIdempotencyKey('ten_1', 'prj_1', 1, 2, ['tme_a'])
    expect(buildInvoiceIdempotencyKey('ten_1', 'prj_1', 1, 2, ['tme_b'])).not.toBe(base)
    expect(buildInvoiceIdempotencyKey('ten_1', 'prj_1', 1, 3, ['tme_a'])).not.toBe(base)
    expect(buildInvoiceIdempotencyKey('ten_1', 'prj_2', 1, 2, ['tme_a'])).not.toBe(base)
    expect(buildInvoiceIdempotencyKey('ten_2', 'prj_1', 1, 2, ['tme_a'])).not.toBe(base)
  })
})
