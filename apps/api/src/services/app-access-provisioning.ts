import { materializeRoleTemplatesForApp } from '@/modules/app-access'
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
}): Promise<{ seeded: number; skipped: number }> {
  let seeded = 0
  let skipped = 0

  for (const appId of [...new Set(params.appIds)]) {
    const result = await materializeRoleTemplatesForApp({
      organizationId: params.organizationId,
      appId,
    })
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

  return { seeded, skipped }
}
