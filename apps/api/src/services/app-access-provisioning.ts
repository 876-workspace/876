import { materializeRoleTemplatesForApp } from '@/modules/app-access/app-access-role-templates.service'
import { getLogger } from '@/platform/logger'

const log = getLogger('app-access-provisioning')

/**
 * Materializes app-role templates for one or more entitled apps.
 *
 * Missing organization roles are created. Existing custom roles are preserved,
 * while canonical system-role copies may synchronize their platform-owned
 * permission set when the template catalog expands.
 */
export async function materializeEntitledAppRoles(params: {
  organizationId: string
  appIds: readonly string[]
}): Promise<{ seeded: number; skipped: number; failed: number }> {
  let seeded = 0
  let skipped = 0
  let failed = 0

  for (const appId of [...new Set(params.appIds)]) {
    let result: { seeded: number; synced: number; skipped: number }
    try {
      result = await materializeRoleTemplatesForApp({
        organizationId: params.organizationId,
        appId,
      })
    } catch (error) {
      // A failure withholds newly materialized/synchronized access rather than
      // widening it. The operation is idempotent, so a later provisioning pass
      // can retry safely while the failure remains visible in logs.
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

    if (result.synced > 0)
      log.info(
        {
          organization_id: params.organizationId,
          app_id: appId,
          count: result.synced,
        },
        'provisioning.app_role_synced'
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
