import { describe, expect, it } from 'vitest'

import { FinanceProvisioningEventSchema } from './finance-provisioning'

const payload = {
  eventId: 'fpe_1',
  eventType: 'finance_connection.ensure',
  contractVersion: 1,
  aggregateId: 'sub_1',
  organization: {
    id: 'org_1',
    name: 'Efesto Technologies',
    slug: 'efesto',
    countryCode: 'JM',
    currencyCode: 'JMD',
  },
  sourceAppId: 'rap_couriers',
  entitlementReference: 'sub_1',
  manifestVersion: 1,
  provisioningRevision: 2,
  lifecycleVersion: 1,
  desiredStatus: 'ACTIVE',
  scopes: ['billing.customers.read'],
  occurredAt: 1_783_771_200,
}

describe('finance provisioning event contract', () => {
  it('accepts the complete current event version', () => {
    expect(FinanceProvisioningEventSchema.parse(payload)).toEqual(payload)
  })

  it('has no legacy/default contract and rejects unknown fields', () => {
    expect(
      FinanceProvisioningEventSchema.safeParse({
        ...payload,
        contractVersion: undefined,
      }).success
    ).toBe(false)
    expect(
      FinanceProvisioningEventSchema.safeParse({ ...payload, legacy: true })
        .success
    ).toBe(false)
  })

  it('rejects provisioning as an external desired state and duplicate scopes', () => {
    expect(
      FinanceProvisioningEventSchema.safeParse({
        ...payload,
        desiredStatus: 'PROVISIONING',
      }).success
    ).toBe(false)
    expect(
      FinanceProvisioningEventSchema.safeParse({
        ...payload,
        scopes: ['billing.customers.read', 'billing.customers.read'],
      }).success
    ).toBe(false)
  })
})
