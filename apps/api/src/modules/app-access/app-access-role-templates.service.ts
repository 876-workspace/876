import { findAppForAccessById } from '@/modules/apps'
import { AppHttpError } from '@/platform/errors'
import { generateId } from '@/platform/ids'
import { nowUnixSeconds } from '@/platform/timestamps'

import * as repository from './app-access.repository'

/**
 * Role-template materialization, kept in its own leaf file.
 *
 * Organization provisioning calls this immediately after an app entitlement is
 * created, and the organizations module calls provisioning back. Reaching it
 * through `app-access.service` — which imports the organizations and memberships
 * modules — would close that loop and make module initialization order
 * load-bearing. This file depends only on the app-access repository and the
 * app lookup, so the provisioning edge stays acyclic.
 */

const ENTERPRISE_SLUG = '876-enterprise'

/**
 * Copies an app's platform role templates into one organization.
 *
 * Idempotent by `(app, organization, key)`: an existing role is left exactly as
 * the organization has it, never overwritten from the template.
 */
export async function materializeRoleTemplatesForApp(params: {
  organizationId: string
  appId: string
}): Promise<{ seeded: number; skipped: number }> {
  const app = await findAppForAccessById(params.appId)
  if (!app)
    throw new AppHttpError({
      code: 'app/not-found',
      message: 'App not found.',
      httpStatus: 404,
    })

  // 876 Enterprise is governed by the organization-role plane, not app roles.
  if (app.slug === ENTERPRISE_SLUG) return { seeded: 0, skipped: 0 }

  const templates = await repository.listRoles(app.id, null)
  let seeded = 0
  let skipped = 0

  for (const template of templates) {
    if (
      await repository.findRoleByKey(
        app.id,
        params.organizationId,
        template.key
      )
    ) {
      skipped += 1
      continue
    }

    const now = BigInt(nowUnixSeconds())
    await repository.createRole({
      id: generateId('role'),
      appId: app.id,
      organizationId: params.organizationId,
      key: template.key,
      name: template.name,
      description: template.description,
      permissions: [...template.permissions],
      isSystem: template.isSystem,
      isDefault: template.isDefault,
      templateKey: template.key,
      position: template.position,
      createdAt: now,
      updatedAt: now,
    })
    seeded += 1
  }

  return { seeded, skipped }
}
