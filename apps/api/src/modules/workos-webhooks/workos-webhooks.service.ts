import { getLogger } from '@/platform/logger'
import * as memberships from '@/modules/memberships'
import * as organizations from '@/modules/organizations'
import * as users from '@/modules/users'

import type { WorkosWebhookEvent } from './workos-webhooks.schemas'

const log = getLogger('workos-webhooks')

function stringOrNull(value: unknown): string | null {
  return typeof value === 'string' ? value : null
}

/**
 * A WorkOS membership role arrives as `{ slug }` on most events and occasionally
 * as a bare string; fall back to `member` so an unexpected shape never throws.
 */
function roleSlug(value: unknown): string {
  if (typeof value === 'string' && value) return value
  if (value && typeof value === 'object' && 'slug' in value) {
    const slug = (value as { slug?: unknown }).slug
    if (typeof slug === 'string' && slug) return slug
  }
  return 'member'
}

/** Apply a WorkOS `user.updated` to the local user. */
async function applyUserUpdated(
  data: WorkosWebhookEvent['data']
): Promise<boolean> {
  const workosUserId = stringOrNull(data.id)
  if (!workosUserId) return false

  return users.syncUserFromWorkos({
    workosUserId,
    firstName: stringOrNull(data.first_name),
    lastName: stringOrNull(data.last_name),
    email: stringOrNull(data.email),
  })
}

/** Apply a WorkOS `organization.updated` to the local organization. */
async function applyOrganizationUpdated(
  data: WorkosWebhookEvent['data']
): Promise<boolean> {
  const workosOrganizationId = stringOrNull(data.id)
  if (!workosOrganizationId) return false

  return organizations.syncOrganizationFromWorkos({
    workosOrganizationId,
    name: stringOrNull(data.name),
  })
}

/** Apply a WorkOS `organization_membership.created`/`.updated` to the local row. */
async function applyMembershipUpsert(
  data: WorkosWebhookEvent['data']
): Promise<boolean> {
  const workosMembershipId = stringOrNull(data.id)
  if (!workosMembershipId) return false

  const orgWorkosId = stringOrNull(data.organization_id)
  const userWorkosId = stringOrNull(data.user_id)
  const organizationId = orgWorkosId
    ? await organizations.findLocalOrgIdByWorkosId(orgWorkosId)
    : null
  const userId = userWorkosId
    ? await users.findLocalUserIdByWorkosId(userWorkosId)
    : null

  const action = await memberships.upsertMembershipFromWorkos({
    workosMembershipId,
    organizationId,
    userId,
    role: roleSlug(data.role),
    status: stringOrNull(data.status) ?? 'active',
  })

  if (action === 'skipped')
    log.info(
      { workos_membership_id: workosMembershipId },
      'workos_webhooks.membership_unresolved'
    )
  return action !== 'skipped'
}

/** Apply a WorkOS `organization_membership.deleted` to the local row. */
async function applyMembershipDeleted(
  data: WorkosWebhookEvent['data']
): Promise<boolean> {
  const workosMembershipId = stringOrNull(data.id)
  if (!workosMembershipId) return false
  return memberships.removeMembershipByWorkosId(workosMembershipId)
}

/** Dispatches WorkOS events to the capability that owns the local state. */
export async function dispatch(
  event: WorkosWebhookEvent
): Promise<{ applied: boolean }> {
  switch (event.event) {
    case 'user.updated':
      return { applied: await applyUserUpdated(event.data) }
    case 'organization.updated':
      return { applied: await applyOrganizationUpdated(event.data) }
    case 'organization_membership.created':
    case 'organization_membership.updated':
      return { applied: await applyMembershipUpsert(event.data) }
    case 'organization_membership.deleted':
      return { applied: await applyMembershipDeleted(event.data) }
    default:
      log.info({ event: event.event }, 'workos_webhooks.unhandled')
      return { applied: false }
  }
}
