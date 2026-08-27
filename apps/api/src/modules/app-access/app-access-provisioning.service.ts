import type { AppMembership } from './app-access.schemas'
import {
  createAppMembership,
  listAppMemberships,
  updateAppMembership,
} from './app-access.service'

/**
 * Idempotently ensures one user's organization-scoped app membership.
 *
 * Trusted provisioning/invite flows use an internal principal so they do not
 * need to impersonate an organization administrator. Entitlement, target
 * membership, app assignability, role ownership, and catalog validation still
 * run through the canonical app-access service.
 */
export async function ensureAppMembershipForProvisioning(params: {
  organizationId: string
  userId: string
  appId: string
  appRoleId?: string | null
  actorUserId?: string | null
}): Promise<AppMembership> {
  const principal = {
    internal: true,
    userId: params.actorUserId ?? null,
  }

  const existing = await listAppMemberships(
    params.organizationId,
    {
      user_id: params.userId,
      app_id: params.appId,
      include_revoked: true,
    },
    principal
  )
  const current = existing.data.find(
    (membership) =>
      membership.user_id === params.userId && membership.app_id === params.appId
  )

  if (current?.assigned) {
    if (
      params.appRoleId !== undefined &&
      params.appRoleId !== null &&
      current.app_role?.id !== params.appRoleId
    )
      return updateAppMembership(
        params.organizationId,
        current.id,
        { app_role_id: params.appRoleId },
        principal
      )
    return current
  }

  return createAppMembership(
    params.organizationId,
    {
      user_id: params.userId,
      app_id: params.appId,
      ...(params.appRoleId !== undefined && params.appRoleId !== null
        ? { app_role_id: params.appRoleId }
        : {}),
      permission_grants: [],
      permission_denies: [],
      status: 'active',
    },
    principal
  )
}
