import type {
  ProvisioningManifest,
  ProvisioningManifestRevision,
  ProvisioningSetup,
} from '@876/core/types/provisioning'
import type { ProvisioningSetupPolicy } from '@876/core/types/provisioning-policy'
import { describe, expect, it } from 'vitest'

import type { ProvisioningImportSpecification } from '../provisioning-import.schemas'
import {
  verifyProvisioningImport,
  type ProvisioningImportVerificationDependencies,
} from '../provisioning-import-verification.service'

const NOW = 1_785_000_000

function spec(): ProvisioningImportSpecification {
  return {
    object: 'provisioning_import_specification',
    manifest_version: 1,
    purpose: 'verification test',
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
      JMD: { name: 'Jamaican Dollar', minor_unit: 2 },
      USD: { name: 'US Dollar', minor_unit: 2 },
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
        is_fallback: false,
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
    application_manifests: [
      {
        app_slug: '876-crm',
        finance_dependency: 'embedded',
        finance_scopes: ['billing.customers.read'],
        resources: [],
        steps: [],
      },
    ],
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
    published_revision: 1,
    has_draft: false,
    organization_count: 0,
    created_at: NOW,
    updated_at: NOW,
  }
}

function publishedRevision(manifestId: string): ProvisioningManifestRevision {
  return {
    object: 'provisioning_manifest_revision',
    id: `pmr_${manifestId}`,
    manifest_id: manifestId,
    manifest_version: 1,
    revision: 1,
    status: 'published',
    reconciliation: 'create_missing',
    preserve_tenant_overrides: true,
    finance_dependency: 'none',
    finance_scopes: [],
    resources: [],
    steps: [],
    published_at: NOW,
    created_at: NOW,
    updated_at: NOW,
  }
}

function manifest(
  targetType: 'finance' | 'organization' | 'application',
  targetKey: string,
  published = true
): ProvisioningManifest {
  const id = `pvm_${targetType}_${targetKey}`
  return {
    object: 'provisioning_manifest',
    id,
    target_type: targetType,
    target_key: targetKey,
    manifest_version: 1,
    published: published ? publishedRevision(id) : null,
    draft: null,
    created_at: NOW,
    updated_at: NOW,
  }
}

function policy(
  setupKey: string,
  options: { fallbackCondition?: boolean; enterpriseEnabled?: boolean } = {}
): ProvisioningSetupPolicy {
  const isJamaica = setupKey === 'jamaica'
  return {
    object: 'provisioning_setup_policy',
    setup_id: `psu_${setupKey}`,
    setup_key: setupKey,
    conditions:
      isJamaica || options.fallbackCondition
        ? [
            {
              object: 'provisioning_setup_condition',
              id: `psc_${setupKey}`,
              group_key: `country-${isJamaica ? 'jm' : 'us'}`,
              field: 'country',
              operator: 'equals',
              value: isJamaica ? 'JM' : 'US',
              priority: 100,
              created_at: NOW,
              updated_at: NOW,
            },
          ]
        : [],
    entitlements: [
      {
        object: 'provisioning_setup_entitlement',
        id: `pse_${setupKey}_enterprise`,
        target_type: 'application',
        target_key: '876-enterprise',
        enabled: options.enterpriseEnabled !== false,
        created_at: NOW,
        updated_at: NOW,
      },
      {
        object: 'provisioning_setup_entitlement',
        id: `pse_${setupKey}_work`,
        target_type: 'service',
        target_key: 'work',
        enabled: true,
        created_at: NOW,
        updated_at: NOW,
      },
    ],
    updated_at: NOW,
  }
}

function dependencies(options: {
  missingFinance?: string
  unpublishedApp?: boolean
  fallbackCondition?: boolean
  enterpriseEnabled?: boolean
} = {}): ProvisioningImportVerificationDependencies {
  return {
    async retrieveSetup(key) {
      if (key === 'jamaica') return setup('jamaica')
      if (key === 'global-usd') return setup('global-usd', true)
      throw new Error('missing setup')
    },
    async retrieveManifest(targetType, targetKey) {
      if (targetType === 'finance' && targetKey === options.missingFinance)
        throw new Error('missing manifest')
      if (targetType === 'application' && targetKey === '876-crm')
        return manifest(targetType, targetKey, !options.unpublishedApp)
      return manifest(targetType, targetKey)
    },
    async retrievePolicy(key) {
      return policy(key, {
        fallbackCondition:
          key === 'global-usd' ? options.fallbackCondition : false,
        enterpriseEnabled: options.enterpriseEnabled,
      })
    },
  }
}

describe('verifyProvisioningImport', () => {
  it('accepts a structurally complete Phase 1 bootstrap', async () => {
    const result = await verifyProvisioningImport(spec(), dependencies())

    expect(result.valid).toBe(true)
    expect(result.issues).toEqual([])
    expect(result.default_setup_key).toBe('global-usd')
    expect(result.manifest_version).toBe(1)
  })

  it('reports missing finance and unpublished application manifests', async () => {
    const result = await verifyProvisioningImport(
      spec(),
      dependencies({ missingFinance: 'jamaica', unpublishedApp: true })
    )

    expect(result.valid).toBe(false)
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'finance_manifest_missing' }),
        expect.objectContaining({ code: 'application_manifest_unpublished' }),
      ])
    )
  })

  it('requires the fallback to remain location-neutral', async () => {
    const result = await verifyProvisioningImport(
      spec(),
      dependencies({ fallbackCondition: true })
    )

    expect(result.valid).toBe(false)
    expect(result.issues).toContainEqual(
      expect.objectContaining({ code: 'fallback_has_conditions' })
    )
  })

  it('requires mandatory Enterprise to remain enabled', async () => {
    const result = await verifyProvisioningImport(
      spec(),
      dependencies({ enterpriseEnabled: false })
    )

    expect(result.valid).toBe(false)
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'enterprise_disabled' }),
      ])
    )
  })
})
