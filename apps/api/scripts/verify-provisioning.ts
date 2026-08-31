import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { buildSetupPolicy } from '@/modules/provisioning/provisioning-import.builders'
import { provisioningImportSpecificationSchema } from '@/modules/provisioning/provisioning-import.schemas'

const DEFAULT_SPEC_PATH = fileURLToPath(
  new URL(
    '../../../docs/handoff/data/2026-08-31-provisioning-defaults.v1.json',
    import.meta.url
  )
)

type VerificationIssue = {
  path: string
  code: string
  message: string
}

function argumentValue(name: string): string | null {
  const prefix = `--${name}=`
  const value = process.argv.slice(2).find((arg) => arg.startsWith(prefix))
  return value ? value.slice(prefix.length) : null
}

async function loadSpecification(path: string) {
  const text = await readFile(path, 'utf8')
  const json: unknown = JSON.parse(text)
  return provisioningImportSpecificationSchema.parse(json)
}

async function main(): Promise<number> {
  const file = argumentValue('file')
  const path = file ? resolve(process.cwd(), file) : DEFAULT_SPEC_PATH
  const spec = await loadSpecification(path)
  const [{ retrieveManifest, retrieveSetup }, { retrieveSetupPolicy }] =
    await Promise.all([
      import('@/modules/provisioning/provisioning.service'),
      import('@/modules/provisioning/provisioning-setup-policy.service'),
    ])

  const issues: VerificationIssue[] = []

  for (const setupSpec of spec.setups) {
    let setup
    try {
      setup = await retrieveSetup(setupSpec.key)
    } catch {
      issues.push({
        path: `setups.${setupSpec.key}`,
        code: 'setup_missing',
        message: `Provisioning setup '${setupSpec.key}' does not exist.`,
      })
      continue
    }

    if (setup.status !== 'active') {
      issues.push({
        path: `setups.${setupSpec.key}.status`,
        code: 'setup_inactive',
        message: `Provisioning setup '${setupSpec.key}' is not active.`,
      })
    }

    if (setupSpec.key === spec.default_setup_key && !setup.is_default) {
      issues.push({
        path: `setups.${setupSpec.key}.is_default`,
        code: 'fallback_not_default',
        message: `Fallback setup '${setupSpec.key}' is not the platform default.`,
      })
    }

    try {
      const manifest = await retrieveManifest('finance', setupSpec.key)
      if (!manifest.published) {
        issues.push({
          path: `manifests.finance.${setupSpec.key}`,
          code: 'finance_manifest_unpublished',
          message: `Finance manifest '${setupSpec.key}' is not published.`,
        })
      }
    } catch {
      issues.push({
        path: `manifests.finance.${setupSpec.key}`,
        code: 'finance_manifest_missing',
        message: `Finance manifest '${setupSpec.key}' does not exist.`,
      })
    }

    try {
      const policy = await retrieveSetupPolicy(setupSpec.key)
      const expected = buildSetupPolicy(spec, setupSpec)

      for (const condition of expected.conditions) {
        const present = policy.conditions.some(
          (candidate) =>
            candidate.field === condition.field &&
            candidate.operator === (condition.operator ?? 'equals') &&
            candidate.value === condition.value
        )
        if (!present) {
          issues.push({
            path: `policies.${setupSpec.key}.conditions`,
            code: 'condition_missing',
            message: `Setup '${setupSpec.key}' is missing ${condition.field}=${condition.value}.`,
          })
        }
      }

      if (setupSpec.is_fallback && policy.conditions.length > 0) {
        issues.push({
          path: `policies.${setupSpec.key}.conditions`,
          code: 'fallback_has_conditions',
          message: `Fallback setup '${setupSpec.key}' must remain location-neutral.`,
        })
      }

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
        ) {
          issues.push({
            path: `policies.${setupSpec.key}.entitlements.876-enterprise`,
            code: 'enterprise_disabled',
            message: `Setup '${setupSpec.key}' has mandatory 876 Enterprise disabled.`,
          })
        }
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
    const organizationManifest = await retrieveManifest(
      'organization',
      spec.organization_manifest.target_key
    )
    if (!organizationManifest.published) {
      issues.push({
        path: `manifests.organization.${spec.organization_manifest.target_key}`,
        code: 'organization_manifest_unpublished',
        message: 'Organization provisioning manifest is not published.',
      })
    }
  } catch {
    issues.push({
      path: `manifests.organization.${spec.organization_manifest.target_key}`,
      code: 'organization_manifest_missing',
      message: 'Organization provisioning manifest does not exist.',
    })
  }

  for (const application of spec.application_manifests) {
    try {
      const manifest = await retrieveManifest('application', application.app_slug)
      if (!manifest.published) {
        issues.push({
          path: `manifests.application.${application.app_slug}`,
          code: 'application_manifest_unpublished',
          message: `Application manifest '${application.app_slug}' is not published.`,
        })
      }
    } catch {
      issues.push({
        path: `manifests.application.${application.app_slug}`,
        code: 'application_manifest_missing',
        message: `Application manifest '${application.app_slug}' does not exist.`,
      })
    }
  }

  const result = {
    object: 'provisioning_import_verification',
    manifest_version: 1,
    file: path,
    valid: issues.length === 0,
    setup_count: spec.setups.length,
    application_manifest_count: spec.application_manifests.length,
    default_setup_key: spec.default_setup_key,
    issues,
  }

  console.log(JSON.stringify(result, null, 2))
  return issues.length === 0 ? 0 : 1
}

let exitCode = 1
try {
  exitCode = await main()
} finally {
  const { disconnectDb } = await import('@/db/client')
  await disconnectDb()
}
process.exitCode = exitCode
