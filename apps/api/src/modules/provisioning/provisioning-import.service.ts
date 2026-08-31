import type {
  ProvisioningManifest,
  ProvisioningSetup,
} from '@876/core/types/provisioning'
import type {
  ProvisioningSetupPolicy,
  ProvisioningSetupPolicyReplaceParams,
} from '@876/core/types/provisioning-policy'

import { isAppHttpError } from '@/http/errors'

import {
  buildApplicationImportDraft,
  buildFinanceImportDraft,
  buildOrganizationImportDraft,
  buildSetupPolicy,
} from './provisioning-import.builders'
import type { ProvisioningImportSpecification } from './provisioning-import.schemas'
import type { ProvisioningDraftReplace } from './provisioning.schemas'

export type ProvisioningImportSummary = {
  object: 'provisioning_import_summary'
  setups_created: number
  setups_preserved: number
  policies_changed: number
  policies_unchanged: number
  finance_manifests_published: number
  finance_manifests_preserved: number
  application_manifests_published: number
  application_manifests_preserved: number
  organization_manifest_published: boolean
  organization_manifest_preserved: boolean
  default_setup_key: string
  default_setup_changed: boolean
  warnings: string[]
}

export type ProvisioningImportDependencies = {
  findSetup(key: string): Promise<ProvisioningSetup | null>
  createSetup(body: {
    key: string
    name: string
    description: string | null
    country_code: null
    currency_code: null
    is_default: false
    copy_from: null
  }): Promise<ProvisioningSetup>
  findManifest(
    targetType: string,
    targetKey: string
  ): Promise<ProvisioningManifest | null>
  replaceDraft(
    targetType: string,
    targetKey: string,
    body: ProvisioningDraftReplace
  ): Promise<unknown>
  publishDraft(targetType: string, targetKey: string): Promise<unknown>
  retrievePolicy(setupKey: string): Promise<ProvisioningSetupPolicy>
  replacePolicy(
    setupKey: string,
    body: ProvisioningSetupPolicyReplaceParams
  ): Promise<ProvisioningSetupPolicy>
  setDefault(setupKey: string): Promise<ProvisioningSetup>
}

async function findSetup(key: string): Promise<ProvisioningSetup | null> {
  const service = await import('./provisioning.service')
  try {
    return await service.retrieveSetup(key)
  } catch (error) {
    if (isAppHttpError(error) && error.code === 'provisioning/setup-not-found')
      return null
    throw error
  }
}

async function findManifest(
  targetType: string,
  targetKey: string
): Promise<ProvisioningManifest | null> {
  const service = await import('./provisioning.service')
  try {
    return await service.retrieveManifest(targetType, targetKey)
  } catch (error) {
    if (
      isAppHttpError(error) &&
      error.code === 'provisioning/manifest-not-found'
    )
      return null
    throw error
  }
}

const DEFAULT_DEPENDENCIES: ProvisioningImportDependencies = {
  findSetup,
  async createSetup(body) {
    const service = await import('./provisioning.service')
    return service.createSetup(body)
  },
  findManifest,
  async replaceDraft(targetType, targetKey, body) {
    const service = await import('./provisioning.service')
    return service.replaceDraft(targetType, targetKey, body)
  },
  async publishDraft(targetType, targetKey) {
    const service = await import('./provisioning.service')
    return service.publishDraft(targetType, targetKey)
  },
  async retrievePolicy(setupKey) {
    const service = await import('./provisioning-setup-policy.service')
    return service.retrieveSetupPolicy(setupKey)
  },
  async replacePolicy(setupKey, body) {
    const service = await import('./provisioning-setup-policy.service')
    return service.replaceSetupPolicy(setupKey, body)
  },
  async setDefault(setupKey) {
    const service = await import('./provisioning.service')
    return service.updateSetup(setupKey, { is_default: true })
  },
}

function isPristineDraft(
  revision: ProvisioningManifest['draft']
): boolean {
  if (!revision) return true
  return (
    revision.finance_dependency === 'none' &&
    revision.finance_scopes.length === 0 &&
    revision.resources.length === 0 &&
    revision.steps.length === 0
  )
}

function mergePolicy(
  current: ProvisioningSetupPolicy,
  desired: ProvisioningSetupPolicyReplaceParams
): ProvisioningSetupPolicyReplaceParams {
  const conditions = current.conditions.map((condition) => ({
    group_key: condition.group_key,
    field: condition.field,
    operator: condition.operator,
    value: condition.value,
    priority: condition.priority,
  }))

  for (const condition of desired.conditions) {
    const normalized = {
      group_key: condition.group_key,
      field: condition.field,
      operator: condition.operator ?? ('equals' as const),
      value: condition.value,
      priority: condition.priority ?? 0,
    }
    const exists = conditions.some(
      (candidate) =>
        candidate.field === normalized.field &&
        candidate.operator === normalized.operator &&
        candidate.value === normalized.value
    )
    if (!exists) conditions.push(normalized)
  }

  const entitlements = current.entitlements.map((entitlement) => ({
    target_type: entitlement.target_type,
    target_key: entitlement.target_key,
    enabled:
      entitlement.target_type === 'application' &&
      entitlement.target_key === '876-enterprise'
        ? true
        : entitlement.enabled,
  }))

  for (const entitlement of desired.entitlements) {
    const exists = entitlements.some(
      (candidate) =>
        candidate.target_type === entitlement.target_type &&
        candidate.target_key === entitlement.target_key
    )
    if (!exists) entitlements.push(entitlement)
  }

  return { conditions, entitlements }
}

function policyChanged(
  current: ProvisioningSetupPolicy,
  merged: ProvisioningSetupPolicyReplaceParams
): boolean {
  if (current.conditions.length !== merged.conditions.length) return true
  if (current.entitlements.length !== merged.entitlements.length) return true

  return (
    merged.conditions.some((condition) => {
      const currentCondition = current.conditions.find(
        (candidate) =>
          candidate.group_key === condition.group_key &&
          candidate.field === condition.field &&
          candidate.operator === (condition.operator ?? 'equals') &&
          candidate.value === condition.value
      )
      return currentCondition?.priority !== (condition.priority ?? 0)
    }) ||
    merged.entitlements.some((entitlement) => {
      const currentEntitlement = current.entitlements.find(
        (candidate) =>
          candidate.target_type === entitlement.target_type &&
          candidate.target_key === entitlement.target_key
      )
      return currentEntitlement?.enabled !== entitlement.enabled
    })
  )
}

async function ensurePublishedManifest(
  dependencies: ProvisioningImportDependencies,
  targetType: 'finance' | 'application' | 'organization',
  targetKey: string,
  draft: ProvisioningDraftReplace
): Promise<'published' | 'preserved'> {
  const current = await dependencies.findManifest(targetType, targetKey)
  if (current?.published) return 'preserved'

  if (current?.draft && !isPristineDraft(current.draft)) return 'preserved'

  await dependencies.replaceDraft(targetType, targetKey, draft)
  await dependencies.publishDraft(targetType, targetKey)
  return 'published'
}

/**
 * Import the temporary Phase 1 development specification without taking
 * ownership of existing operator configuration.
 *
 * Missing setups and pristine/unpublished manifests are initialized. Existing
 * published manifests and non-empty drafts are preserved. Setup policies are
 * merged additively so missing country/entitlement rows are backfilled without
 * discarding operator-authored conditions or entitlement choices.
 */
export async function importProvisioningSpecification(
  spec: ProvisioningImportSpecification,
  dependencies: ProvisioningImportDependencies = DEFAULT_DEPENDENCIES
): Promise<ProvisioningImportSummary> {
  const summary: ProvisioningImportSummary = {
    object: 'provisioning_import_summary',
    setups_created: 0,
    setups_preserved: 0,
    policies_changed: 0,
    policies_unchanged: 0,
    finance_manifests_published: 0,
    finance_manifests_preserved: 0,
    application_manifests_published: 0,
    application_manifests_preserved: 0,
    organization_manifest_published: false,
    organization_manifest_preserved: false,
    default_setup_key: spec.default_setup_key,
    default_setup_changed: false,
    warnings: [],
  }

  for (const setupSpec of spec.setups) {
    let setup = await dependencies.findSetup(setupSpec.key)
    if (!setup) {
      setup = await dependencies.createSetup({
        key: setupSpec.key,
        name: setupSpec.name,
        description: setupSpec.description ?? null,
        country_code: null,
        currency_code: null,
        is_default: false,
        copy_from: null,
      })
      summary.setups_created += 1
    } else {
      summary.setups_preserved += 1
      if (setup.status !== 'active') {
        summary.warnings.push(
          `Setup '${setup.key}' is archived and was preserved without changing its lifecycle state.`
        )
      }
    }

    const currentPolicy = await dependencies.retrievePolicy(setupSpec.key)
    const mergedPolicy = mergePolicy(
      currentPolicy,
      buildSetupPolicy(spec, setupSpec)
    )
    if (policyChanged(currentPolicy, mergedPolicy)) {
      await dependencies.replacePolicy(setupSpec.key, mergedPolicy)
      summary.policies_changed += 1
    } else {
      summary.policies_unchanged += 1
    }

    const financeResult = await ensurePublishedManifest(
      dependencies,
      'finance',
      setupSpec.key,
      buildFinanceImportDraft(spec, setupSpec)
    )
    if (financeResult === 'published') summary.finance_manifests_published += 1
    else {
      summary.finance_manifests_preserved += 1
      const current = await dependencies.findManifest('finance', setupSpec.key)
      if (
        !current?.published &&
        current?.draft &&
        !isPristineDraft(current.draft)
      ) {
        summary.warnings.push(
          `Setup '${setupSpec.key}' has an unpublished non-empty finance draft; the importer preserved it and did not publish specification defaults over it.`
        )
      }
    }
  }

  const organizationResult = await ensurePublishedManifest(
    dependencies,
    'organization',
    spec.organization_manifest.target_key,
    buildOrganizationImportDraft(spec)
  )
  summary.organization_manifest_published = organizationResult === 'published'
  summary.organization_manifest_preserved = organizationResult === 'preserved'

  for (const application of spec.application_manifests) {
    const result = await ensurePublishedManifest(
      dependencies,
      'application',
      application.app_slug,
      buildApplicationImportDraft(application)
    )
    if (result === 'published') summary.application_manifests_published += 1
    else {
      summary.application_manifests_preserved += 1
      const current = await dependencies.findManifest(
        'application',
        application.app_slug
      )
      if (
        !current?.published &&
        current?.draft &&
        !isPristineDraft(current.draft)
      ) {
        summary.warnings.push(
          `Application '${application.app_slug}' has an unpublished non-empty provisioning draft; it was preserved.`
        )
      }
    }
  }

  const defaultSetup = await dependencies.findSetup(spec.default_setup_key)
  if (!defaultSetup) {
    throw new Error(
      `Provisioning import did not create default setup '${spec.default_setup_key}'.`
    )
  }
  const defaultManifest = await dependencies.findManifest(
    'finance',
    spec.default_setup_key
  )
  if (!defaultManifest?.published) {
    throw new Error(
      `Default setup '${spec.default_setup_key}' does not have a published finance manifest.`
    )
  }
  if (defaultSetup.status !== 'active') {
    throw new Error(
      `Default setup '${spec.default_setup_key}' is archived and cannot be promoted.`
    )
  }
  if (!defaultSetup.is_default) {
    await dependencies.setDefault(spec.default_setup_key)
    summary.default_setup_changed = true
  }

  return summary
}
