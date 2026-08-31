import type {
  ProvisioningManifest,
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

function specification(): ProvisioningImportSpecification {
  return {
    object: 'provisioning_import_specification',
    manifest_version: 1,
    purpose: 'idempotency test',
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
      USD: { name: 'US Dollar', minor_unit: 2, symbol: '$' },
    },
    common_finance_defaults: {
      reconciliation: 'create_missing',
      preserve_tenant_overrides: true,
      payment_modes: [{ key: 'cash', name: 'Cash' }],
      payment_terms: [
        {
          key: 'due-on-receipt',
          name: 'Due on Receipt',
          rule: 'DUE_ON_RECEIPT',
          due_days: 0,
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

function setup(isDefault = false): ProvisioningSetup {
  return {
    object: 'provisioning_setup',
    id: 'psu_global_usd',
    key: 'global-usd',
    name: 'Global USD',
    description: null,
    country_code: null,
    currency_code: null,
    status: 'active',
    is_default: isDefault,
    manifest_target: 'finance/global-usd',
    published_revision: isDefault ? 1 : null,
    has_draft: false,
    organization_count: 0,
    created_at: NOW,
    updated_at: NOW,
  }
}

function publishedManifest(
  targetType: 'finance' | 'organization',
  targetKey: string
): ProvisioningManifest {
  return {
    object: 'provisioning_manifest',
    id: `pvm_${targetType}_${targetKey}`,
    target_type: targetType,
    target_key: targetKey,
    manifest_version: 1,
    published: {
      object: 'provisioning_manifest_revision',
      id: `pmr_${targetType}_${targetKey}`,
      manifest_id: `pvm_${targetType}_${targetKey}`,
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
    },
    draft: null,
    created_at: NOW,
    updated_at: NOW,
  }
}

function emptyPolicy(): ProvisioningSetupPolicy {
  return {
    object: 'provisioning_setup_policy',
    setup_id: 'psu_global_usd',
    setup_key: 'global-usd',
    conditions: [],
    entitlements: [],
    updated_at: NOW,
  }
}

describe('one-time provisioning importer reruns', () => {
  it('turns a second run into preservation/no-op behavior', async () => {
    let currentSetup: ProvisioningSetup | null = null
    let currentPolicy = emptyPolicy()
    const manifests = new Map<string, ProvisioningManifest>()

    const replaceDraft = vi.fn(async () => undefined)
    const publishDraft = vi.fn(async (targetType: string, targetKey: string) => {
      manifests.set(
        `${targetType}:${targetKey}`,
        publishedManifest(targetType as 'finance' | 'organization', targetKey)
      )
    })
    const replacePolicy = vi.fn(
      async (_setupKey: string, body: ProvisioningSetupPolicyReplaceParams) => {
        currentPolicy = {
          ...emptyPolicy(),
          entitlements: body.entitlements.map((entry, index) => ({
            object: 'provisioning_setup_entitlement',
            id: `pse_${index}`,
            ...entry,
            created_at: NOW,
            updated_at: NOW,
          })),
        }
        return currentPolicy
      }
    )
    const setDefault = vi.fn(async () => {
      currentSetup = { ...(currentSetup ?? setup()), is_default: true }
      return currentSetup
    })

    const dependencies: ProvisioningImportDependencies = {
      async findSetup() {
        return currentSetup
      },
      async createSetup() {
        currentSetup = setup(false)
        return currentSetup
      },
      async findManifest(targetType, targetKey) {
        return manifests.get(`${targetType}:${targetKey}`) ?? null
      },
      replaceDraft,
      publishDraft,
      async retrievePolicy() {
        return currentPolicy
      },
      replacePolicy,
      setDefault,
    }

    const first = await importProvisioningSpecification(
      specification(),
      dependencies
    )
    const second = await importProvisioningSpecification(
      specification(),
      dependencies
    )

    expect(first).toMatchObject({
      setups_created: 1,
      finance_manifests_published: 1,
      organization_manifest_published: true,
      default_setup_changed: true,
    })
    expect(second).toMatchObject({
      setups_created: 0,
      setups_preserved: 1,
      policies_changed: 0,
      policies_unchanged: 1,
      finance_manifests_published: 0,
      finance_manifests_preserved: 1,
      organization_manifest_published: false,
      organization_manifest_preserved: true,
      default_setup_changed: false,
    })
    expect(replaceDraft).toHaveBeenCalledTimes(2)
    expect(publishDraft).toHaveBeenCalledTimes(2)
    expect(replacePolicy).toHaveBeenCalledTimes(1)
    expect(setDefault).toHaveBeenCalledTimes(1)
  })
})
