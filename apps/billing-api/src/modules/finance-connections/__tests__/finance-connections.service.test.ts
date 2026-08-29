import { createHash } from 'node:crypto'

import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { FinanceProvisioningEvent } from '@876/server/finance-provisioning'

const mocks = vi.hoisted(() => ({
  applyFinanceProvisioningEvent: vi.fn(),
  findActiveConnectionAuthorization: vi.fn(),
  findStatsProduct: vi.fn(),
  findStatsSubscriptions: vi.fn(),
  findStatsTenant: vi.fn(),
  LifecycleConflict: class FinanceConnectionLifecycleConflict extends Error {},
}))

vi.mock('../finance-connections.repository', () => ({
  applyFinanceProvisioningEvent: mocks.applyFinanceProvisioningEvent,
  findActiveConnectionAuthorization: mocks.findActiveConnectionAuthorization,
  findStatsProduct: mocks.findStatsProduct,
  findStatsSubscriptions: mocks.findStatsSubscriptions,
  findStatsTenant: mocks.findStatsTenant,
  FinanceConnectionLifecycleConflict: mocks.LifecycleConflict,
}))

import {
  activeConnectionAuthorization,
  appStats,
  ensureFinanceConnection,
} from '../finance-connections.service'

function event(
  overrides: Partial<FinanceProvisioningEvent> = {}
): FinanceProvisioningEvent {
  return {
    eventId: 'fpe_001',
    eventType: 'finance_connection.ensure',
    contractVersion: 1,
    aggregateId: 'org_1:app_1',
    organization: {
      id: 'org_1',
      name: 'Test Org',
      slug: 'test-org',
      countryCode: 'JM',
      currencyCode: 'JMD',
    },
    sourceAppId: 'app_1',
    entitlementReference: 'sub_1',
    manifestVersion: 1,
    provisioningRevision: 2,
    lifecycleVersion: 3,
    desiredStatus: 'ACTIVE',
    scopes: ['billing.customers.read', 'billing.customers.write'],
    occurredAt: 1_787_000_000,
    ...overrides,
  }
}

function hashFor(e: FinanceProvisioningEvent): string {
  return createHash('sha256').update(JSON.stringify(e)).digest('hex')
}

const connection = {
  id: 'afc_1',
  tenantId: 'ten_1',
  status: 'ACTIVE',
  lifecycleVersion: 3,
}

describe('ensureFinanceConnection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns the applied receipt on a new connection', async () => {
    const e = event()
    mocks.applyFinanceProvisioningEvent.mockResolvedValue({
      receipt: { payloadHash: hashFor(e), applied: true },
      connection: { ...connection, status: 'ACTIVE' },
      duplicate: false,
    })

    const result = await ensureFinanceConnection(e)

    expect(result).toEqual({
      id: 'afc_1',
      tenantId: 'ten_1',
      status: 'ACTIVE',
      lifecycleVersion: 3,
      applied: true,
      duplicate: false,
    })
  })

  it('returns applied=false and duplicate=true for an idempotent replay', async () => {
    const e = event()
    mocks.applyFinanceProvisioningEvent.mockResolvedValue({
      receipt: { payloadHash: hashFor(e), applied: false },
      connection: { ...connection, status: 'ACTIVE' },
      duplicate: true,
    })

    const result = await ensureFinanceConnection(e)

    expect(result.applied).toBe(false)
    expect(result.duplicate).toBe(true)
  })

  it('throws 409 idempotency-conflict when the same eventId has a different payload hash', async () => {
    const e = event()
    mocks.applyFinanceProvisioningEvent.mockResolvedValue({
      receipt: { payloadHash: 'different-hash', applied: false },
      connection: { ...connection },
      duplicate: true,
    })

    await expect(ensureFinanceConnection(e)).rejects.toMatchObject({
      code: 'app_finance_connection/idempotency-conflict',
      httpStatus: 409,
    })
  })

  it('throws 409 lifecycle-conflict when the repository detects a same-version state mismatch', async () => {
    mocks.applyFinanceProvisioningEvent.mockRejectedValue(
      new mocks.LifecycleConflict()
    )

    await expect(ensureFinanceConnection(event())).rejects.toMatchObject({
      code: 'app_finance_connection/lifecycle-conflict',
      httpStatus: 409,
    })
  })

  it('propagates non-conflict errors unchanged', async () => {
    const error = new Error('connection pool exhausted')
    mocks.applyFinanceProvisioningEvent.mockRejectedValue(error)

    await expect(ensureFinanceConnection(event())).rejects.toBe(error)
  })

  it('throws when the receipt references a missing connection', async () => {
    const e = event()
    mocks.applyFinanceProvisioningEvent.mockResolvedValue({
      receipt: { payloadHash: hashFor(e), applied: false },
      connection: null,
      duplicate: true,
    })

    await expect(ensureFinanceConnection(e)).rejects.toThrow(
      'references a missing connection'
    )
  })

  it('throws when the persisted connection status is not ACTIVE, SUSPENDED, or REVOKED', async () => {
    const e = event()
    mocks.applyFinanceProvisioningEvent.mockResolvedValue({
      receipt: { payloadHash: hashFor(e), applied: true },
      connection: { ...connection, status: 'PROVISIONING' },
      duplicate: false,
    })

    await expect(ensureFinanceConnection(e)).rejects.toThrow(
      'Unexpected persisted finance connection status: PROVISIONING'
    )
  })

  it('computes the same payload hash as the repository for an identical event', async () => {
    const e = event()
    mocks.applyFinanceProvisioningEvent.mockResolvedValue({
      receipt: { payloadHash: hashFor(e), applied: true },
      connection: { ...connection },
      duplicate: false,
    })

    await ensureFinanceConnection(e)

    expect(mocks.applyFinanceProvisioningEvent).toHaveBeenCalledWith(
      e,
      hashFor(e),
      expect.any(Number)
    )
  })

  it('returns SUSPENDED and REVOKED statuses without rejecting', async () => {
    for (const desiredStatus of ['SUSPENDED', 'REVOKED'] as const) {
      const e = event({ desiredStatus })
      mocks.applyFinanceProvisioningEvent.mockResolvedValue({
        receipt: { payloadHash: hashFor(e), applied: true },
        connection: { ...connection, status: desiredStatus },
        duplicate: false,
      })

      const result = await ensureFinanceConnection(e)

      expect(result.status).toBe(desiredStatus)
    }
  })
})

describe('activeConnectionAuthorization', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns the connection scopes as a Set when the connection is ACTIVE', async () => {
    mocks.findActiveConnectionAuthorization.mockResolvedValue({
      status: 'ACTIVE',
      scopes: ['billing.customers.read', 'billing.invoices.write'],
    })

    const result = await activeConnectionAuthorization('ten_1', 'app_1')

    expect(result).toEqual({
      scopes: new Set(['billing.customers.read', 'billing.invoices.write']),
    })
  })

  it('returns null when no connection exists', async () => {
    mocks.findActiveConnectionAuthorization.mockResolvedValue(null)

    const result = await activeConnectionAuthorization('ten_1', 'app_1')

    expect(result).toBeNull()
  })

  it('returns null when the connection is SUSPENDED', async () => {
    mocks.findActiveConnectionAuthorization.mockResolvedValue({
      status: 'SUSPENDED',
      scopes: ['billing.customers.read'],
    })

    expect(await activeConnectionAuthorization('ten_1', 'app_1')).toBeNull()
  })

  it('returns null when the connection is REVOKED', async () => {
    mocks.findActiveConnectionAuthorization.mockResolvedValue({
      status: 'REVOKED',
      scopes: ['billing.customers.read'],
    })

    expect(await activeConnectionAuthorization('ten_1', 'app_1')).toBeNull()
  })
})

describe('appStats', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns the admin client app stats contract for an attributed app', async () => {
    mocks.findStatsTenant.mockResolvedValue({ defaultCurrency: 'USD' })
    mocks.findStatsProduct.mockResolvedValue({ id: 'prod_1' })
    mocks.findStatsSubscriptions.mockResolvedValue([
      {
        id: 'sub_1',
        sourceAppId: 'app_1',
        externalReference: 'core_sub_1',
        customerId: 'cus_1',
        status: 'ACTIVE',
        startAt: 100,
        currentPeriodEnd: 200,
        createdAt: 100,
        customer: { name: 'Ada Lovelace' },
        items: [
          {
            quantity: 2,
            unitAmount: null,
            price: {
              unitAmount: 1_200n,
              priceType: 'RECURRING',
              plan: {
                id: 'plan_1',
                code: 'pro',
                name: 'Pro',
                entitlementReferenceId: 'ent_1',
                intervalUnit: 'MONTH',
                intervalCount: 1,
              },
            },
          },
        ],
        invoices: [{ totalAmount: 2_400n, amountDue: 400n }],
      },
    ])

    await expect(appStats('ten_1', 'app_1')).resolves.toEqual({
      object: 'app_billing_stats',
      sourceAppId: 'app_1',
      activeSubscriptions: 1,
      trialingSubscriptions: 0,
      canceledSubscriptions: 0,
      customerCount: 1,
      monthlyRecurringRevenue: '2400',
      currency: 'USD',
      invoicedTotal: '2400',
      paidTotal: '2000',
      outstandingTotal: '400',
      plans: [
        {
          object: 'plan_billing_stats',
          planId: 'plan_1',
          code: 'pro',
          name: 'Pro',
          entitlementReferenceId: 'ent_1',
          activeSubscriptions: 1,
          trialingSubscriptions: 0,
          monthlyRecurringRevenue: '2400',
          subscribers: [
            {
              object: 'plan_subscriber',
              subscriptionId: 'sub_1',
              externalReference: 'core_sub_1',
              customerId: 'cus_1',
              customerName: 'Ada Lovelace',
              status: 'ACTIVE',
              startAt: 100,
              currentPeriodEnd: 200,
              monthlyRecurringRevenue: '2400',
            },
          ],
        },
      ],
    })
  })

  it('returns a sorted list of stats for every attributed app', async () => {
    mocks.findStatsTenant.mockResolvedValue({ defaultCurrency: 'USD' })
    mocks.findStatsSubscriptions.mockResolvedValue([])

    await expect(appStats('ten_1')).resolves.toEqual([])
    expect(mocks.findStatsSubscriptions).toHaveBeenCalledWith(
      'ten_1',
      undefined
    )
  })
})
