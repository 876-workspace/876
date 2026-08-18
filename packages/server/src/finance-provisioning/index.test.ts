import { describe, expect, it } from 'vitest'

import {
  FinanceProvisioningContractError,
  financeProvisioningEventSchema,
  financeProvisioningReceiptEnvelopeSchema,
  parseFinanceProvisioningEvent,
  parseFinanceProvisioningReceipt,
  type FinanceProvisioningEvent,
} from './index'

function event(
  overrides: Partial<FinanceProvisioningEvent> = {}
): FinanceProvisioningEvent {
  return {
    eventId: 'finance_evt_123',
    eventType: 'finance_connection.ensure',
    contractVersion: 1,
    aggregateId: 'org_123:876-invoice',
    organization: {
      id: 'org_123',
      name: 'Test Org',
      slug: 'test-org',
      countryCode: 'JM',
      currencyCode: 'JMD',
    },
    sourceAppId: '876-invoice',
    entitlementReference: 'sub_123',
    manifestVersion: 1,
    provisioningRevision: 7,
    lifecycleVersion: 3,
    desiredStatus: 'ACTIVE',
    scopes: ['billing.customers.read', 'billing.customers.write'],
    occurredAt: 1_787_000_000,
    ...overrides,
  }
}

function response(overrides: Record<string, unknown> = {}) {
  return {
    data: {
      id: 'finance_connection_123',
      tenantId: 'btenant_123',
      status: 'ACTIVE',
      lifecycleVersion: 3,
      applied: true,
      duplicate: false,
      ...overrides,
    },
    error: null,
  }
}

describe('finance provisioning shared contract', () => {
  it('accepts the canonical provisioning event', () => {
    expect(financeProvisioningEventSchema.parse(event())).toEqual(event())
  })

  it('rejects malformed scopes before either service can send or accept them', () => {
    expect(() =>
      parseFinanceProvisioningEvent({
        ...event(),
        scopes: ['read'],
      })
    ).toThrow(FinanceProvisioningContractError)
  })

  it('rejects duplicate scopes', () => {
    expect(() =>
      parseFinanceProvisioningEvent({
        ...event(),
        scopes: ['billing.customers.read', 'billing.customers.read'],
      })
    ).toThrow(FinanceProvisioningContractError)
  })

  it('accepts Billing success envelopes that prove the requested state', () => {
    const parsed = parseFinanceProvisioningReceipt(event(), response(), {
      exactState: true,
    })
    expect(parsed).toMatchObject({
      tenantId: 'btenant_123',
      status: 'ACTIVE',
      lifecycleVersion: 3,
    })
  })

  it('accepts an exact duplicate receipt as proof of idempotent delivery', () => {
    const parsed = parseFinanceProvisioningReceipt(
      event(),
      response({ applied: false, duplicate: true }),
      { exactState: true }
    )
    expect(parsed.duplicate).toBe(true)
  })

  it('rejects a 2xx-shaped body that is not the 876 success envelope', () => {
    expect(financeProvisioningReceiptEnvelopeSchema.safeParse({ ok: true }).success).toBe(
      false
    )
    expect(() =>
      parseFinanceProvisioningReceipt(event(), { ok: true })
    ).toThrowError(
      expect.objectContaining({ issue: 'invalid-response' })
    )
  })

  it('rejects a receipt behind the event lifecycle', () => {
    expect(() =>
      parseFinanceProvisioningReceipt(
        event(),
        response({ lifecycleVersion: 2 })
      )
    ).toThrowError(expect.objectContaining({ issue: 'stale-response' }))
  })

  it('rejects a different state at the same lifecycle', () => {
    expect(() =>
      parseFinanceProvisioningReceipt(event(), response({ status: 'SUSPENDED' }))
    ).toThrowError(expect.objectContaining({ issue: 'state-mismatch' }))
  })

  it('allows background replay to observe a newer lifecycle', () => {
    expect(
      parseFinanceProvisioningReceipt(
        event(),
        response({ lifecycleVersion: 4, status: 'SUSPENDED' })
      )
    ).toMatchObject({ lifecycleVersion: 4, status: 'SUSPENDED' })
  })

  it('does not let foreground readiness pass on a superseding lifecycle', () => {
    expect(() =>
      parseFinanceProvisioningReceipt(
        event(),
        response({ lifecycleVersion: 4, status: 'SUSPENDED' }),
        { exactState: true }
      )
    ).toThrowError(expect.objectContaining({ issue: 'superseded-response' }))
  })
})
