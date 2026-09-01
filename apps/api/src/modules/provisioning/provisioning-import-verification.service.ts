import type {
  ProvisioningManifest,
  ProvisioningSetup,
} from '@876/core/types/provisioning'
import type { ProvisioningSetupPolicy } from '@876/core/types/provisioning-policy'

import * as applicationProfileRepository from './application-provisioning-profile.repository'
import { buildSetupPolicy } from './provisioning-import.builders'
import type { ProvisioningImportSpecification } from './provisioning-import.schemas'

export type ProvisioningImportVerificationIssue = {
  path: string
  code: string
  message: string
}

export type ProvisioningImportVerification = {
  object: 'provisioning_import_verification'
  manifest_version: 1
  valid: boolean
  setup_count: number
  application_manifest_count: number
  application_profile_count: number
  default_setup_key: string
  issues: ProvisioningImportVerificationIssue[]
}

export type ProvisioningImportVerificationDependencies = {
  retrieveSetup(setupKey: string): Promise<ProvisioningSetup>
  retrieveManifest(
    targetType: 'finance' | 'application' | 'organization',
    targetKey: string
  ): Promise<ProvisioningManifest>
  retrievePolicy(setupKey: string): Promise<ProvisioningSetupPolicy>
  retrieveDefaultApplicationProfile(appKey: string): Promise<{
    id: string
    key: string
    status: string
    isDefault: boolean
    manifestTargetKey: string
  }>
}

const DEFAULT_DEPENDENCIES: ProvisioningImportVerificationDependencies = {
  async retrieveSetup(setupKey) {
    const service = await import('./provisioning.service')
    return service.retrieveSetup(setupKey)
  },
  async retrieveManifest(targetType, targetKey) {
    const service = await import('./provisioning.service')
    return service.retrieveManifest(targetType, targetKey)
  },
  async retrievePolicy(setupKey) {
    const service = await import('./provisioning-setup-policy.service')
    return service.retrieveSetupPolicy(setupKey)
  },
  async retrieveDefaultApplicationProfile(appKey) {
    const app = await applicationProfileRepository.findAppByIdOrSlug(appKey)
    if (!app) throw new Error(`Application '${appKey}' does not exist.`)
    const profile = await applicationProfileRepository.findDefaultProfile(app.id)
    if (!profile)
      throw new Error(`Application '${appKey}' has no default provisioning profile.`)
    return {
      id: profile.id,
      key: profile.key,
      status: profile.status,
      isDefault: profile.isDefault,
      manifestTargetKey: profile.manifestTargetKey,
    }
  },
}

export async function verifyProvisioningImport(
  spec: ProvisioningImportSpecification,
  dependencies: ProvisioningImportVerificationDependencies = DEFAULT_DEPENDENCIES
): Promise<ProvisioningImportVerification> {
  const issues: ProvisioningImportVerificationIssue[] = []
  let applicationProfileCount = 0

  for (const setupSpec of spec.setups) {
    let setup: ProvisioningSetup | null = null
    try {
      setup = await dependencies.retrieveSetup(setupSpec.key)
    } catch {
      issues.push({
        path: `setups.${setupSpec.key}`,
        code: 'setup_missing',
        message: `Provisioning setup '${setupSpec.key}' does not exist.`,
      })
    }

    if (setup) {
      if (setup.status !== 'active')
        issues.push({
          path: `setups.${setupSpec.key}.status`,
          code: 'setup_inactive',
          message: `Provisioning setup '${setupSpec.key}' is not active.`,
        })

      if (setupSpec.key === spec.default_setup_key && !setup.is_default)
        issues.push({
          path: `setups.${setupSpec.key}.is_default`,
          code: 'fallback_not_default',
          message: `Fallback setup '${setupSpec.key}' is not the platform default.`,
        })
    }

    try {
      const manifest = await dependencies.retrieveManifest(
        'finance',
        setupSpec.key
      )
      if (!manifest.published)
        issues.push({
          path: `manifests.finance.${setupSpec.key}`,
          code: 'finance_manifest_unpublished',
          message: `Finance manifest '${setupSpec.key}' is not published.`,
        })
    } catch {
      issues.push({
        path: `manifests.finance.${setupSpec.key}`,
        code: 'finance_manifest_missing',
        message: `Finance manifest '${setupSpec.key}' does not exist.`,
      })
    }

    try {
      const policy = await dependencies.retrievePolicy(setupSpec.key)
      const expected = buildSetupPolicy(spec, setupSpec)

      for (const condition of expected.conditions) {
        const present = policy.conditions.some(
          (candidate) =>
            candidate.group_key === condition.group_key &&
            candidate.field === condition.field &&
            candidate.operator === (condition.operator ?? 'equals') &&
            candidate.value === condition.value &&
            candidate.priority === (condition.priority ?? 0)
        )
        if (!present)
          issues.push({
            path: `policies.${setupSpec.key}.conditions`,
            code: 'condition_missing',
            message: `Setup '${setupSpec.key}' is missing ${condition.field}=${condition.value}.`,
          })
      }

      if (setupSpec.is_fallback && policy.conditions.length > 0)
        issues.push({
          path: `policies.${setupSpec.key}.conditions`,
          code: 'fallback_has_conditions',
          message: `Fallback setup '${setupSpec.key}' must remain location-neutral.`,
        })

      for (const entitlement of expected.entitlements) {
        const actual = policy.entitlements.find(
          (candidate) =>
            candidate.target_type === entitlement.target_type &&
            candidate.target_key === entitlement.target_key
        )
        if (!actual) {
          issues.push({
            path: `policies.${setupSpec.key}.entitlements`,
            code: 'entitlement_missing',
            message: `Setup '${setupSpec.key}' is missing ${entitlement.target_type}/${entitlement.target_key}.`,
          })
          continue
        }

        if (
          entitlement.target_type === 'application' &&
          entitlement.target_key === '876-enterprise' &&
          !actual.enabled
        )
          issues.push({
            path: `policies.${setupSpec.key}.entitlements.876-enterprise`,
            code: 'enterprise_disabled',
            message: `Setup '${setupSpec.key}' has mandatory 876 Enterprise disabled.`,
          })
      }
    } catch {
      issues.push({
        path: `policies.${setupSpec.key}`,
        code: 'policy_missing',
        message: `Provisioning policy for '${setupSpec.key}' could not be retrieved.`,
      })
    }
  }

  try {
    const organizationManifest = await dependencies.retrieveManifest(
      'organization',
      spec.organization_manifest.target_key
    )
    if (!organizationManifest.published)
      issues.push({
        path: `manifests.organization.${spec.organization_manifest.target_key}`,
        code: 'organization_manifest_unpublished',
        message: 'Organization provisioning manifest is not published.',
      })
  } catch {
    issues.push({
      path: `manifests.organization.${spec.organization_manifest.target_key}`,
      code: 'organization_manifest_missing',
      message: 'Organization provisioning manifest does not exist.',
    })
  }

  for (const application of spec.application_manifests) {
    let profile: Awaited<
      ReturnType<
        ProvisioningImportVerificationDependencies['retrieveDefaultApplicationProfile']
      >
    > | null = null
    try {
      profile = await dependencies.retrieveDefaultApplicationProfile(
        application.app_slug
      )
      applicationProfileCount += 1
      if (!profile.isDefault)
        issues.push({
          path: `profiles.application.${application.app_slug}.is_default`,
          code: 'application_default_profile_invalid',
          message: `Application '${application.app_slug}' does not have a valid default provisioning profile.`,
        })
      if (profile.status !== 'active')
        issues.push({
          path: `profiles.application.${application.app_slug}.status`,
          code: 'application_default_profile_inactive',
          message: `Default provisioning profile for '${application.app_slug}' is not active.`,
        })
    } catch {
      issues.push({
        path: `profiles.application.${application.app_slug}`,
        code: 'application_default_profile_missing',
        message: `Application '${application.app_slug}' has no default provisioning profile.`,
      })
    }

    try {
      const manifest = await dependencies.retrieveManifest(
        'application',
        application.app_slug
      )
      if (!manifest.published)
        issues.push({
          path: `manifests.application.${application.app_slug}`,
          code: 'application_manifest_unpublished',
          message: `Application manifest '${application.app_slug}' is not published.`,
        })
      if (profile && manifest.target_key !== profile.manifestTargetKey)
        issues.push({
          path: `manifests.application.${application.app_slug}.target_key`,
          code: 'application_default_manifest_mismatch',
          message: `Application '${application.app_slug}' generic manifest does not point at its default provisioning profile.`,
        })
    } catch {
      issues.push({
        path: `manifests.application.${application.app_slug}`,
        code: 'application_manifest_missing',
        message: `Application manifest '${application.app_slug}' does not exist.`,
      })
    }
  }

  return {
    object: 'provisioning_import_verification',
    manifest_version: 1,
    valid: issues.length === 0,
    setup_count: spec.setups.length,
    application_manifest_count: spec.application_manifests.length,
    application_profile_count: applicationProfileCount,
    default_setup_key: spec.default_setup_key,
    issues,
  }
}
