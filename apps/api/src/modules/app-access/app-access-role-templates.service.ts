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

function samePermissions(left: readonly string[], right: readonly string[]) {
  return (
    left.length === right.length &&
    left.every((permission, index) => permission === right[index])
  )
}

/**
 * Copies an app's platform role templates into one organization.
 *
 * Idempotent by `(app, organization, key)`. Custom roles and presentation
 * fields are preserved. A live organization copy of a platform-managed system
 * template synchronizes only its immutable permission set so additions to the
 * canonical catalog do not leave existing organizations on stale access.
 */
export async function materializeRoleTemplatesForApp(params: {
  organizationId: string
  appId: string
}): Promise<{ seeded: number; synced: number; skipped: number }> {
  const app = await findAppForAccessById(params.appId)
  if (!app)
    throw new AppHttpError({
      code: 'app/not-found',
      message: 'App not found.',
      httpStatus: 404,
    })

  // 876 Enterprise is governed by the organization-role plane, not app roles.
  if (app.slug === ENTERPRISE_SLUG)
    return { seeded: 0, synced: 0, skipped: 0 }

  const templates = await repository.listRoles(app.id, null)
  let seeded = 0
  let synced = 0
  let skipped = 0

  for (const template of templates) {
    const existing = await repository.findRoleByKey(
      app.id,
      params.organizationId,
      template.key
    )

    if (existing) {
      const canonicalSystemCopy =
        template.isSystem &&
        existing.isSystem &&
        existing.templateKey === template.key

      if (
        canonicalSystemCopy &&
        !samePermissions(existing.permissions, template.permissions)
      ) {
        const updated = await repository.updateRole(
          existing.id,
          app.id,
          params.organizationId,
          {
            permissions: [...template.permissions],
            updatedAt: BigInt(nowUnixSeconds()),
          }
        )
        if (!updated)
          throw new Error(
            `Failed to synchronize system app role ${app.id}.${template.key}.`
          )
        synced += 1
      } else {
        skipped += 1
      }
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

  return { seeded, synced, skipped }
}
