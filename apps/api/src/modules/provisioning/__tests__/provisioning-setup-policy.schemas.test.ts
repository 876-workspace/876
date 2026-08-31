import { describe, expect, it } from 'vitest'

import { provisioningSetupPolicyReplaceSchema } from '../provisioning-setup-policy.schemas'

describe('provisioningSetupPolicyReplaceSchema', () => {
  it('normalizes country and subdivision values', () => {
    const result = provisioningSetupPolicyReplaceSchema.parse({
      conditions: [
        {
          group_key: 'jm',
          field: 'country',
          operator: 'equals',
          value: 'jm',
          priority: 100,
        },
        {
          group_key: 'us-ca',
          field: 'subdivision',
          operator: 'equals',
          value: 'us-ca',
          priority: 200,
        },
      ],
      entitlements: [
        {
          target_type: 'service',
          target_key: 'work',
          enabled: true,
        },
      ],
    })

    expect(result.conditions.map((condition) => condition.value)).toEqual([
      'JM',
      'US-CA',
    ])
  })

  it('supports several countries as separate match alternatives', () => {
    const result = provisioningSetupPolicyReplaceSchema.safeParse({
      conditions: [
        {
          group_key: 'jm',
          field: 'country',
          value: 'JM',
          priority: 100,
        },
        {
          group_key: 'tt',
          field: 'country',
          value: 'TT',
          priority: 100,
        },
      ],
      entitlements: [],
    })

    expect(result.success).toBe(true)
  })

  it('supports country and subdivision in the same AND group', () => {
    const result = provisioningSetupPolicyReplaceSchema.safeParse({
      conditions: [
        {
          group_key: 'us-ca',
          field: 'country',
          value: 'US',
          priority: 200,
        },
        {
          group_key: 'us-ca',
          field: 'subdivision',
          value: 'US-CA',
          priority: 200,
        },
      ],
      entitlements: [],
    })

    expect(result.success).toBe(true)
  })

  it('rejects invalid country and subdivision codes', () => {
    const country = provisioningSetupPolicyReplaceSchema.safeParse({
      conditions: [
        {
          group_key: 'bad',
          field: 'country',
          value: 'JAM',
        },
      ],
      entitlements: [],
    })
    const subdivision = provisioningSetupPolicyReplaceSchema.safeParse({
      conditions: [
        {
          group_key: 'bad',
          field: 'subdivision',
          value: 'California',
        },
      ],
      entitlements: [],
    })

    expect(country.success).toBe(false)
    expect(subdivision.success).toBe(false)
  })

  it('requires one priority across every condition in a group', () => {
    const result = provisioningSetupPolicyReplaceSchema.safeParse({
      conditions: [
        {
          group_key: 'us-ca',
          field: 'country',
          value: 'US',
          priority: 100,
        },
        {
          group_key: 'us-ca',
          field: 'subdivision',
          value: 'US-CA',
          priority: 200,
        },
      ],
      entitlements: [],
    })

    expect(result.success).toBe(false)
  })

  it('rejects duplicate conditions', () => {
    const result = provisioningSetupPolicyReplaceSchema.safeParse({
      conditions: [
        { group_key: 'jm', field: 'country', value: 'JM' },
        { group_key: 'jm', field: 'country', value: 'JM' },
      ],
      entitlements: [],
    })

    expect(result.success).toBe(false)
  })

  it('rejects duplicate entitlement targets', () => {
    const result = provisioningSetupPolicyReplaceSchema.safeParse({
      conditions: [],
      entitlements: [
        {
          target_type: 'service',
          target_key: 'work',
          enabled: true,
        },
        {
          target_type: 'service',
          target_key: 'work',
          enabled: false,
        },
      ],
    })

    expect(result.success).toBe(false)
  })

  it('accepts a jurisdiction condition for future resolvers', () => {
    const result = provisioningSetupPolicyReplaceSchema.parse({
      conditions: [
        {
          group_key: 'special-zone',
          field: 'jurisdiction',
          value: 'custom-tax-zone',
          priority: 300,
        },
      ],
      entitlements: [],
    })

    expect(result.conditions[0]?.value).toBe('custom-tax-zone')
  })
})
