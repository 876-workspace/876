import { materializeRoleTemplatesForApp } from '@/modules/app-access/app-access-role-templates.service'
import { getLogger } from '@/platform/logger'

const log = getLogger('app-access-provisioning')

/**
 * Materializes app-role templates for one or more newly entitled apps.
 *
 * This is the shared hook for organization provisioning and later entitlement
 * activation. It is deliberately idempotent: the app-access service never
 * overwrites an existing organization role with the same key.
 */
export async function materializeEntitledAppRoles(params: {
  organizationId: string
  appIds: readonly string[]
}): Promise<{ seeded: number; skipped: number; failed: number }> {
  let seeded = 0
  let skipped = 0
  let failed = 0

  for (const appId of [...new Set(params.appIds)]) {
    let result: { seeded: number; skipped: number }
    try {
      result = await materializeRoleTemplatesForApp({
        organizationId: params.organizationId,
        appId,
      })
    } catch (error) {
      // Seeding an app's role templates can only *add* assignable roles, so a
      // failure withholds access rather than widening it. Aborting the whole
      // provisioning run would instead take signup down for every new
      // organization, which is strictly worse and is not an authorization
      // decision. Materialization is idempotent, so the next provisioning pass
      // retries; the failure is recorded so it cannot pass unnoticed.
      failed += 1
      log.error(
        {
          organization_id: params.organizationId,
          app_id: appId,
          err: error,
        },
        'provisioning.app_role_failed'
      )
      continue
    }

    seeded += result.seeded
    skipped += result.skipped

    if (result.seeded > 0)
      log.info(
        {
          organization_id: params.organizationId,
          app_id: appId,
          count: result.seeded,
        },
        'provisioning.app_role_seeded'
      )

    if (result.skipped > 0)
      log.info(
        {
          organization_id: params.organizationId,
          app_id: appId,
          count: result.skipped,
        },
        'provisioning.app_role_skipped'
      )
  }

  return { seeded, skipped, failed }
}
