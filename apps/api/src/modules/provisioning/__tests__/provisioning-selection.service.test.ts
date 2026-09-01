import type {
  ProvisioningSelectionCandidate,
  ProvisioningSetupSelection,
} from '@876/core/types/provisioning-selection'
import type {
  ProvisioningSetupCondition,
  ProvisioningSetupEntitlement,
} from '@876/core/types/provisioning-policy'
import { describe, expect, it } from 'vitest'

import { AppHttpError } from '@/http/errors'

import { resolveProvisioningSetupFromCandidates } from '../provisioning-selection.service'

const NOW = 1_788_163_200

function condition(params: {
  id?: string
  group: string
  field: 'country' | 'subdivision' | 'jurisdiction'
  value: string
  priority?: number
}): ProvisioningSetupCondition {
  return {
    object: 'provisioning_setup_condition',
    id: params.id ?? `${params.group}-${params.field}-${params.value}`,
    group_key: params.group,
    field: params.field,
    operator: 'equals',
    value: params.value,
    priority: params.priority ?? 0,
    created_at: NOW,
    updated_at: NOW,
  }
}

function enterpriseEntitlement(): ProvisioningSetupEntitlement {
  return {
    object: 'provisioning_setup_entitlement',
    id: 'ent-enterprise',
    target_type: 'application',
    target_key: '876-enterprise',
    enabled: true,
    created_at: NOW,
    updated_at: NOW,
  }
}

function candidate(params: {
  key: string
  fallback?: boolean
  conditions?: ProvisioningSetupCondition[]
}): ProvisioningSelectionCandidate {
  return {
    id: `setup-${params.key}`,
    key: params.key,
    is_default: params.fallback ?? false,
    policy: {
      conditions: params.conditions ?? [],
      entitlements: [enterpriseEntitlement()],
    },
  }
}

function expectPolicySelection(
  result: ProvisioningSetupSelection,
  expected: {
    key: string
    group: string
    priority: number
    fields: Array<'country' | 'subdivision' | 'jurisdiction'>
  }
): void {
  expect(result).toEqual({
    setup_id: `setup-${expected.key}`,
    setup_key: expected.key,
    match_type: 'policy',
    match_group_key: expected.group,
    match_priority: expected.priority,
    matched_fields: expected.fields,
    context: expect.any(Object),
  })
}

describe('resolveProvisioningSetupFromCandidates', () => {
  it('matches a country condition and returns the complete audit decision', () => {
    // ARRANGE
    const candidates = [
      candidate({
        key: 'jamaica',
        conditions: [
          condition({ group: 'jm', field: 'country', value: 'JM', priority: 50 }),
        ],
      }),
      candidate({ key: 'global-usd', fallback: true }),
    ]

    // ACT
    const result = resolveProvisioningSetupFromCandidates(candidates, {
      country: 'JM',
    })

    // ASSERT
    expect(result).toEqual({
      setup_id: 'setup-jamaica',
      setup_key: 'jamaica',
      match_type: 'policy',
      match_group_key: 'jm',
      match_priority: 50,
      matched_fields: ['country'],
      context: {
        country: 'JM',
        subdivision: null,
        jurisdiction: null,
      },
    })
  })

  it('normalizes country and subdivision input before matching', () => {
    // ARRANGE
    const candidates = [
      candidate({
        key: 'california',
        conditions: [
          condition({ group: 'ca', field: 'country', value: 'US' }),
          condition({ group: 'ca', field: 'subdivision', value: 'US-CA' }),
        ],
      }),
      candidate({ key: 'global-usd', fallback: true }),
    ]

    // ACT
    const result = resolveProvisioningSetupFromCandidates(candidates, {
      country: ' us ',
      subdivision: ' us-ca ',
    })

    // ASSERT
    expectPolicySelection(result, {
      key: 'california',
      group: 'ca',
      priority: 0,
      fields: ['country', 'subdivision'],
    })
    expect(result.context).toEqual({
      country: 'US',
      subdivision: 'US-CA',
      jurisdiction: null,
    })
  })

  it('trims jurisdiction without inventing case normalization', () => {
    // ARRANGE
    const candidates = [
      candidate({
        key: 'nyc',
        conditions: [
          condition({
            group: 'nyc',
            field: 'jurisdiction',
            value: 'nyc-sales-tax',
          }),
        ],
      }),
      candidate({ key: 'global-usd', fallback: true }),
    ]

    // ACT
    const result = resolveProvisioningSetupFromCandidates(candidates, {
      jurisdiction: ' nyc-sales-tax ',
    })

    // ASSERT
    expectPolicySelection(result, {
      key: 'nyc',
      group: 'nyc',
      priority: 0,
      fields: ['jurisdiction'],
    })
    expect(result.context.jurisdiction).toBe('nyc-sales-tax')
  })

  it('treats groups as OR alternatives', () => {
    // ARRANGE
    const regional = candidate({
      key: 'caribbean-standard',
      conditions: [
        condition({ group: 'barbados', field: 'country', value: 'BB' }),
        condition({ group: 'trinidad', field: 'country', value: 'TT' }),
      ],
    })
    const candidates = [regional, candidate({ key: 'global-usd', fallback: true })]

    // ACT
    const result = resolveProvisioningSetupFromCandidates(candidates, {
      country: 'TT',
    })

    // ASSERT
    expectPolicySelection(result, {
      key: 'caribbean-standard',
      group: 'trinidad',
      priority: 0,
      fields: ['country'],
    })
  })

  it('requires every condition inside a group to match', () => {
    // ARRANGE
    const candidates = [
      candidate({
        key: 'california',
        conditions: [
          condition({ group: 'ca', field: 'country', value: 'US' }),
          condition({ group: 'ca', field: 'subdivision', value: 'US-CA' }),
        ],
      }),
      candidate({
        key: 'united-states',
        conditions: [condition({ group: 'us', field: 'country', value: 'US' })],
      }),
      candidate({ key: 'global-usd', fallback: true }),
    ]

    // ACT
    const result = resolveProvisioningSetupFromCandidates(candidates, {
      country: 'US',
      subdivision: 'US-NY',
    })

    // ASSERT
    expectPolicySelection(result, {
      key: 'united-states',
      group: 'us',
      priority: 0,
      fields: ['country'],
    })
  })

  it('does not treat a missing context value as a matching condition', () => {
    // ARRANGE
    const candidates = [
      candidate({
        key: 'california',
        conditions: [
          condition({ group: 'ca', field: 'country', value: 'US' }),
          condition({ group: 'ca', field: 'subdivision', value: 'US-CA' }),
        ],
      }),
      candidate({ key: 'global-usd', fallback: true }),
    ]

    // ACT
    const result = resolveProvisioningSetupFromCandidates(candidates, {
      country: 'US',
      subdivision: null,
    })

    // ASSERT
    expect(result.match_type).toBe('fallback')
    expect(result.setup_key).toBe('global-usd')
  })

  it('lets a more specific rule beat a much higher-priority broad rule', () => {
    // ARRANGE
    const candidates = [
      candidate({
        key: 'united-states',
        conditions: [
          condition({ group: 'us', field: 'country', value: 'US', priority: 999 }),
        ],
      }),
      candidate({
        key: 'california',
        conditions: [
          condition({ group: 'ca', field: 'country', value: 'US', priority: 1 }),
          condition({
            group: 'ca',
            field: 'subdivision',
            value: 'US-CA',
            priority: 1,
          }),
        ],
      }),
      candidate({ key: 'global-usd', fallback: true }),
    ]

    // ACT
    const result = resolveProvisioningSetupFromCandidates(candidates, {
      country: 'US',
      subdivision: 'US-CA',
    })

    // ASSERT
    expectPolicySelection(result, {
      key: 'california',
      group: 'ca',
      priority: 1,
      fields: ['country', 'subdivision'],
    })
  })

  it('uses priority only after specificity ties', () => {
    // ARRANGE
    const candidates = [
      candidate({
        key: 'us-standard',
        conditions: [
          condition({ group: 'a', field: 'country', value: 'US', priority: 10 }),
        ],
      }),
      candidate({
        key: 'us-priority',
        conditions: [
          condition({ group: 'b', field: 'country', value: 'US', priority: 20 }),
        ],
      }),
      candidate({ key: 'global-usd', fallback: true }),
    ]

    // ACT
    const result = resolveProvisioningSetupFromCandidates(candidates, {
      country: 'US',
    })

    // ASSERT
    expectPolicySelection(result, {
      key: 'us-priority',
      group: 'b',
      priority: 20,
      fields: ['country'],
    })
  })

  it('uses setup key lexical ordering as the final cross-setup tie break', () => {
    // ARRANGE
    const candidates = [
      candidate({
        key: 'z-rule',
        conditions: [condition({ group: 'same', field: 'country', value: 'US' })],
      }),
      candidate({
        key: 'a-rule',
        conditions: [condition({ group: 'same', field: 'country', value: 'US' })],
      }),
      candidate({ key: 'global-usd', fallback: true }),
    ]

    // ACT
    const result = resolveProvisioningSetupFromCandidates(candidates, {
      country: 'US',
    })

    // ASSERT
    expect(result.setup_key).toBe('a-rule')
  })

  it('uses group key lexical ordering as the final intra-setup tie break', () => {
    // ARRANGE
    const candidates = [
      candidate({
        key: 'us',
        conditions: [
          condition({ group: 'z-group', field: 'country', value: 'US' }),
          condition({ group: 'a-group', field: 'country', value: 'US' }),
        ],
      }),
      candidate({ key: 'global-usd', fallback: true }),
    ]

    // ACT
    const result = resolveProvisioningSetupFromCandidates(candidates, {
      country: 'US',
    })

    // ASSERT
    expect(result.setup_key).toBe('us')
    expect(result.match_group_key).toBe('a-group')
  })

  it.each([
    ['original', ['z-rule', 'a-rule', 'global-usd']],
    ['reversed', ['global-usd', 'a-rule', 'z-rule']],
    ['mixed', ['a-rule', 'global-usd', 'z-rule']],
  ])('returns the same decision regardless of candidate order: %s', (_label, order) => {
    // ARRANGE
    const byKey = new Map([
      [
        'z-rule',
        candidate({
          key: 'z-rule',
          conditions: [condition({ group: 'same', field: 'country', value: 'US' })],
        }),
      ],
      [
        'a-rule',
        candidate({
          key: 'a-rule',
          conditions: [condition({ group: 'same', field: 'country', value: 'US' })],
        }),
      ],
      ['global-usd', candidate({ key: 'global-usd', fallback: true })],
    ])
    const candidates = order.map((key) => byKey.get(key)!)

    // ACT
    const result = resolveProvisioningSetupFromCandidates(candidates, {
      country: 'US',
    })

    // ASSERT
    expect(result.setup_key).toBe('a-rule')
    expect(result.match_group_key).toBe('same')
  })

  it('uses the sole configured fallback when no policy group matches', () => {
    // ARRANGE
    const candidates = [
      candidate({
        key: 'jamaica',
        conditions: [condition({ group: 'jm', field: 'country', value: 'JM' })],
      }),
      candidate({ key: 'global-usd', fallback: true }),
    ]

    // ACT
    const result = resolveProvisioningSetupFromCandidates(candidates, {
      country: 'DE',
    })

    // ASSERT
    expect(result).toEqual({
      setup_id: 'setup-global-usd',
      setup_key: 'global-usd',
      match_type: 'fallback',
      match_group_key: null,
      match_priority: null,
      matched_fields: [],
      context: {
        country: 'DE',
        subdivision: null,
        jurisdiction: null,
      },
    })
  })

  it('uses the fallback for an entirely empty routing context', () => {
    // ARRANGE
    const candidates = [
      candidate({
        key: 'jamaica',
        conditions: [condition({ group: 'jm', field: 'country', value: 'JM' })],
      }),
      candidate({ key: 'global-usd', fallback: true }),
    ]

    // ACT
    const result = resolveProvisioningSetupFromCandidates(candidates, {})

    // ASSERT
    expect(result.setup_key).toBe('global-usd')
    expect(result.context).toEqual({
      country: null,
      subdivision: null,
      jurisdiction: null,
    })
  })

  it('rejects an unmatched candidate set with no fallback', () => {
    // ARRANGE
    const candidates = [
      candidate({
        key: 'jamaica',
        conditions: [condition({ group: 'jm', field: 'country', value: 'JM' })],
      }),
    ]

    // ACT
    const act = () =>
      resolveProvisioningSetupFromCandidates(candidates, { country: 'US' })

    // ASSERT
    expect(act).toThrowError(AppHttpError)
    expect(act).toThrowError(
      'Provisioning setup selection requires exactly one active published fallback.'
    )
  })

  it('rejects an unmatched candidate set with multiple fallbacks', () => {
    // ARRANGE
    const candidates = [
      candidate({ key: 'fallback-a', fallback: true }),
      candidate({ key: 'fallback-b', fallback: true }),
    ]

    // ACT
    const act = () => resolveProvisioningSetupFromCandidates(candidates, {})

    // ASSERT
    expect(act).toThrowError(AppHttpError)
    expect(act).toThrowError(
      'Provisioning setup selection requires exactly one active published fallback.'
    )
  })

  it('allows a matching policy to win even when the same setup is marked fallback', () => {
    // ARRANGE
    const candidates = [
      candidate({
        key: 'global-usd',
        fallback: true,
        conditions: [
          condition({ group: 'us', field: 'country', value: 'US', priority: 5 }),
        ],
      }),
    ]

    // ACT
    const result = resolveProvisioningSetupFromCandidates(candidates, {
      country: 'US',
    })

    // ASSERT
    expect(result.match_type).toBe('policy')
    expect(result.match_group_key).toBe('us')
  })

  it('counts distinct matched dimensions rather than duplicate conditions as specificity', () => {
    // ARRANGE
    const candidates = [
      candidate({
        key: 'duplicate-country',
        conditions: [
          condition({ id: 'one', group: 'dup', field: 'country', value: 'US' }),
          condition({ id: 'two', group: 'dup', field: 'country', value: 'US' }),
        ],
      }),
      candidate({
        key: 'country-subdivision',
        conditions: [
          condition({ group: 'specific', field: 'country', value: 'US' }),
          condition({
            group: 'specific',
            field: 'subdivision',
            value: 'US-CA',
          }),
        ],
      }),
      candidate({ key: 'global-usd', fallback: true }),
    ]

    // ACT
    const result = resolveProvisioningSetupFromCandidates(candidates, {
      country: 'US',
      subdivision: 'US-CA',
    })

    // ASSERT
    expect(result.setup_key).toBe('country-subdivision')
    expect(result.matched_fields).toEqual(['country', 'subdivision'])
  })
})
