import type {
  ProvisioningManifest,
  ProvisioningManifestRevision,
  ProvisioningSetup,
} from '@876/core/types/provisioning'
import type {
  ProvisioningSetupPolicy,
  ProvisioningSetupPolicyReplaceParams,
} from '@876/core/types/provisioning-policy'
import { describe, expect, it, vi } from 'vitest'

import type { ProvisioningImportSpecification } from '../provisioning-import.schemas'
import {
  importProvisioningSpecification,
  type ProvisioningImportDependencies,
} from '../provisioning-import.service'

const NOW = 1_785_000_000

function spec(): ProvisioningImportSpecification {
  return {
    object: 'provisioning_import_specification',
    manifest_version: 1,
    purpose: 'test one-time bootstrap',
    import_mode: 'one_time_database_bootstrap',
    runtime_source_of_truth: false,
    delete_after_verified_import: true,
    default_setup_key: 'global-usd',
    default_language: 'en',
    country_scope: {
      caribbean: ['JM'],
      united_states: ['US'],
      canada: ['CA'],
    },
    matching: {
      semantics: 'OR_OF_AND_GROUPS',
      current_seed_condition: 'country equals ISO code',
      future_fields: ['subdivision', 'jurisdiction'],
    },
    default_entitlements: [
      {
        target_type: 'application',
        target_key: '876-enterprise',
        enabled: true,
      },
      { target_type: 'service', target_key: 'work', enabled: true },
    ],
    currencies: {
      JMD: {
        name: 'Jamaican Dollar',
        numeric_code: '388',
        minor_unit: 2,
        symbol: '$',
      },
      USD: { name: 'US Dollar', minor_unit: 2, symbol: '$' },
    },
    common_finance_defaults: {
      reconciliation: 'create_missing',
      preserve_tenant_overrides: true,
      payment_modes: [{ key: 'cash', name: 'Cash' }],
      payment_terms: [
        {
          key: 'net-30',
          name: 'Net 30',
          rule: 'NET_DAYS',
          due_days: 30,
        },
      ],
      invoice_preference: {
        key: 'default',
        default_tax_behavior: 'EXCLUSIVE',
        late_fees_enabled: false,
        late_fee_calculation_type: 'PERCENTAGE',
        late_fee_grace_days: 0,
        late_fee_generate_as_draft: true,
      },
    },
    setups: [
      {
        key: 'jamaica',
        name: 'Jamaica',
        country_codes: ['JM'],
        currency_code: 'JMD',
      },
      {
        key: 'global-usd',
        name: 'Global USD',
        country_codes: [],
        currency_code: 'USD',
        is_fallback: true,
      },
    ],
    organization_manifest: {
      target_key: 'global',
      finance_dependency: 'none',
      finance_scopes: [],
      resources: [],
      steps: [],
    },
    application_manifests: [],
  }
}

function setup(key: string, isDefault = false): ProvisioningSetup {
  return {
    object: 'provisioning_setup',
    id: `psu_${key}`,
    key,
    name: key,
    description: null,
    country_code: null,
    currency_code: null,
    status: 'active',
    is_default: isDefault,
    manifest_target: `finance/${key}`,
    published_revision: null,
    has_draft: false,
    organization_count: 0,
    created_at: NOW,
    updated_at: NOW,
  }
}

function revision(
  manifestId: string,
  status: 'draft' | 'published',
  nonEmpty = false
): ProvisioningManifestRevision {
  return {
    object: 'provisioning_manifest_revision',
    id: `pmr_${manifestId}_${status}`,
    manifest_id: manifestId,
    manifest_version: 1,
    revision: 1,
    status,
    reconciliation: 'create_missing',
    preserve_tenant_overrides: true,
    finance_dependency: 'none',
    finance_scopes: [],
    resources: nonEmpty
      ? [
          {
            object: 'provisioning_resource',
            id: 'prs_custom',
            resource_type: 'currency',
            key: 'CUSTOM',
            position: 10,
            properties: [],
          },
        ]
      : [],
    steps: [],
    published_at: status === 'published' ? NOW : null,
    created_at: NOW,
    updated_at: NOW,
  }
}

function manifest(
  targetType: 'finance' | 'organization' | 'application',
  targetKey: string,
  options: { published?: boolean; nonEmptyDraft?: boolean } = {}
): ProvisioningManifest {
  const id = `pvm_${targetType}_${targetKey}`
  return {
    object: 'provisioning_manifest',
    id,
    target_type: targetType,
    target_key: targetKey,
    manifest_version: 1,
    published: options.published ? revision(id, 'published') : null,
    draft: options.nonEmptyDraft ? revision(id, 'draft', true) : null,
    created_at: NOW,
    updated_at: NOW,
  }
}

function policy(
  setupKey: string,
  overrides: Partial<ProvisioningSetupPolicy> = {}
): ProvisioningSetupPolicy {
  return {
    object: 'provisioning_setup_policy',
    setup_id: `psu_${setupKey}`,
    setup_key: setupKey,
    conditions: [],
    entitlements: [],
    updated_at: NOW,
    ...overrides,
  }
}

function createDependencies(options: {
  setups?: ProvisioningSetup[]
  manifests?: ProvisioningManifest[]
  policies?: ProvisioningSetupPolicy[]
} = {}) {
  const setups = new Map((options.setups ?? []).map((row) => [row.key, row]))
  const manifests = new Map(
    (options.manifests ?? []).map((row) => [
      `${row.target_type}:${row.target_key}`,
      row,
    ])
  )
  const policies = new Map(
    (options.policies ?? []).map((row) => [row.setup_key, row])
  )

  const replacePolicy = vi.fn(
    async (setupKey: string, body: ProvisioningSetupPolicyReplaceParams) => {
      const next = policy(setupKey, {
        conditions: body.conditions.map((condition, index) => ({
          object: 'provisioning_setup_condition',
          id: `psc_${index}`,
          group_key: condition.group_key,
          field: condition.field,
          operator: condition.operator ?? 'equals',
          value: condition.value,
          priority: condition.priority ?? 0,
          created_at: NOW,
          updated_at: NOW,
        })),
        entitlements: body.entitlements.map((entitlement, index) => ({
          object: 'provisioning_setup_entitlement',
          id: `pse_${index}`,
          ...entitlement,
          created_at: NOW,
          updated_at: NOW,
        })),
      })
      policies.set(setupKey, next)
      return next
    }
  )

  const replaceDraft = vi.fn(async () => undefined)
  const publishDraft = vi.fn(async (targetType: string, targetKey: string) => {
    const key = `${targetType}:${targetKey}`
    manifests.set(
      key,
      manifest(targetType as 'finance' | 'organization' | 'application', targetKey, {
        published: true,
      })
    )
  })
  const setDefault = vi.fn(async (setupKey: string) => {
    for (const [key, row] of setups)
      setups.set(key, { ...row, is_default: key === setupKey })
    return setups.get(setupKey)!
  })

  const dependencies: ProvisioningImportDependencies = {
    async findSetup(key) {
      return setups.get(key) ?? null
    },
    async createSetup(body) {
      const row = setup(body.key)
      setups.set(row.key, row)
      return row
    },
    async findManifest(targetType, targetKey) {
      return manifests.get(`${targetType}:${targetKey}`) ?? null
    },
    replaceDraft,
    publishDraft,
    async retrievePolicy(setupKey) {
      return policies.get(setupKey) ?? policy(setupKey)
    },
    replacePolicy,
    setDefault,
  }

  return {
    dependencies,
    setups,
    manifests,
    policies,
    replacePolicy,
    replaceDraft,
    publishDraft,
    setDefault,
  }
}

describe('importProvisioningSpecification', () => {
  it('creates missing setups, publishes missing manifests, and promotes the fallback', async () => {
    const state = createDependencies()

    const result = await importProvisioningSpecification(spec(), state.dependencies)

    expect(result.setups_created).toBe(2)
    expect(result.finance_manifests_published).toBe(2)
    expect(result.organization_manifest_published).toBe(true)
    expect(result.default_setup_changed).toBe(true)
    expect(state.setups.get('global-usd')?.is_default).toBe(true)
    expect(state.publishDraft).toHaveBeenCalledWith('finance', 'jamaica')
    expect(state.publishDraft).toHaveBeenCalledWith('finance', 'global-usd')
    expect(state.publishDraft).toHaveBeenCalledWith('organization', 'global')
  })

  it('preserves published manifests and non-empty operator drafts', async () => {
    const state = createDependencies({
      setups: [setup('jamaica'), setup('global-usd', true)],
      manifests: [
        manifest('finance', 'jamaica', { nonEmptyDraft: true }),
        manifest('finance', 'global-usd', { published: true }),
        manifest('organization', 'global', { published: true }),
      ],
    })

    const result = await importProvisioningSpecification(spec(), state.dependencies)

    expect(result.finance_manifests_preserved).toBe(2)
    expect(result.organization_manifest_preserved).toBe(true)
    expect(result.warnings).toContainEqual(
      expect.stringContaining("Setup 'jamaica' has an unpublished non-empty finance draft")
    )
    expect(state.replaceDraft).not.toHaveBeenCalledWith(
      'finance',
      'jamaica',
      expect.anything()
    )
  })

  it('backfills missing policy rows without overriding explicit operator choices', async () => {
    const jamaicaPolicy = policy('jamaica', {
      conditions: [
        {
          object: 'provisioning_setup_condition',
          id: 'psc_custom',
          group_key: 'custom',
          field: 'jurisdiction',
          operator: 'equals',
          value: 'special',
          priority: 500,
          created_at: NOW,
          updated_at: NOW,
        },
      ],
      entitlements: [
        {
          object: 'provisioning_setup_entitlement',
          id: 'pse_enterprise',
          target_type: 'application',
          target_key: '876-enterprise',
          enabled: false,
          created_at: NOW,
          updated_at: NOW,
        },
        {
          object: 'provisioning_setup_entitlement',
          id: 'pse_work',
          target_type: 'service',
          target_key: 'work',
          enabled: false,
          created_at: NOW,
          updated_at: NOW,
        },
      ],
    })
    const state = createDependencies({
      setups: [setup('jamaica'), setup('global-usd', true)],
      manifests: [
        manifest('finance', 'jamaica', { published: true }),
        manifest('finance', 'global-usd', { published: true }),
        manifest('organization', 'global', { published: true }),
      ],
      policies: [jamaicaPolicy, policy('global-usd')],
    })

    await importProvisioningSpecification(spec(), state.dependencies)

    const jamaicaCall = state.replacePolicy.mock.calls.find(
      ([setupKey]) => setupKey === 'jamaica'
    )
    expect(jamaicaCall).toBeDefined()
    const body = jamaicaCall?.[1]
    expect(body?.conditions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: 'jurisdiction',
          value: 'special',
          priority: 500,
        }),
        expect.objectContaining({ field: 'country', value: 'JM' }),
      ])
    )
    expect(body?.entitlements).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          target_type: 'application',
          target_key: '876-enterprise',
          enabled: true,
        }),
        expect.objectContaining({
          target_type: 'service',
          target_key: 'work',
          enabled: false,
        }),
      ])
    )
  })
})
