import { findRoleByIdForOrg } from './access.repository'
import * as repository from './invite-app-access.repository'
import type { InviteAppAccessSelectionRow } from './invite-app-access.repository'

export type { InviteAppAccessSelectionRow }

/**
 * Invite and organization-role reads exposed to the app-access module.
 *
 * Invite tokens and organization roles are organization-owned tables, so
 * app-access reaches them through this service rather than querying them
 * directly — the same one-way `app-access → organizations` direction every
 * other cross-module read in this module already uses.
 */
export function findInviteAccessSelectionById(
  inviteId: string
): Promise<InviteAppAccessSelectionRow | null> {
  return repository.findInviteAppAccessSelectionById(inviteId)
}

export function findInviteAccessSelectionByToken(
  token: string
): Promise<InviteAppAccessSelectionRow | null> {
  return repository.findInviteAppAccessSelectionByToken(token)
}

export function updateInviteAccessSelection(
  inviteId: string,
  selection: {
    appRoleId: string | null
    orgRoleId: string | null
    updatedAt: bigint
  }
): Promise<InviteAppAccessSelectionRow | null> {
  return repository.updateInviteAppAccessSelection(inviteId, selection)
}

/** Resolve one organization role for invite role-selection validation. */
export async function findOrgRoleForInvite(
  roleId: string,
  organizationId: string
): Promise<{ id: string; name: string } | null> {
  const role = await findRoleByIdForOrg(roleId, organizationId)
  return role ? { id: role.id, name: role.name } : null
}
