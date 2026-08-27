import {
  findInviteAccessSelectionById,
  findInviteAccessSelectionByToken,
  findOrgRoleForInvite,
  getOrgAppEntitlement,
  updateInviteAccessSelection,
} from '@/modules/organizations'
import { AppHttpError, appError } from '@/platform/errors'
import { nowUnixSeconds } from '@/platform/timestamps'

import { findOrgAppRoleForAccess } from './app-access-lookup.service'
import { ensureAppMembershipForProvisioning } from './app-access-provisioning.service'

const ENTITLED_STATUSES = new Set(['active', 'trialing'])

export type ValidatedInviteAppAccessSelection = {
  sourceAppId: string | null
  appRoleId: string | null
  orgRoleId: string | null
  orgRoleName: string | null
}

function inviteNotFound(): AppHttpError {
  return new AppHttpError({
    code: 'invite/not-found',
    message: 'No invite exists with the provided identifier.',
    httpStatus: 404,
  })
}

/**
 * Validates role selections captured by an organization invite.
 *
 * The selected organization role must belong to the invite organization. An
 * app role must belong to the same organization and source app. Source-app
 * invites also require an active/trialing entitlement at invite creation and
 * again at acceptance so an expired entitlement cannot be bypassed by an old
 * invite link.
 */
export async function validateInviteAppAccessSelection(params: {
  organizationId: string
  sourceAppId?: string | null
  appRoleId?: string | null
  orgRoleId?: string | null
}): Promise<ValidatedInviteAppAccessSelection> {
  const sourceAppId = params.sourceAppId ?? null
  const appRoleId = params.appRoleId ?? null
  const orgRoleId = params.orgRoleId ?? null

  let orgRoleName: string | null = null
  if (orgRoleId) {
    const orgRole = await findOrgRoleForInvite(orgRoleId, params.organizationId)
    if (!orgRole)
      throw new AppHttpError({
        code: 'role/not-found',
        message: 'No organization role exists with the provided identifier.',
        httpStatus: 404,
      })
    orgRoleName = orgRole.name
  }

  if (appRoleId && !sourceAppId)
    throw new AppHttpError({
      code: 'invite/app-required',
      message: 'An app role can only be selected for a source app invite.',
      httpStatus: 400,
    })

  if (sourceAppId) {
    const entitlement = await getOrgAppEntitlement(
      params.organizationId,
      sourceAppId
    )
    if (!entitlement || !ENTITLED_STATUSES.has(entitlement.status))
      throw appError('app-membership/not-entitled')

    if (appRoleId) {
      const appRole = await findOrgAppRoleForAccess({
        appId: sourceAppId,
        organizationId: params.organizationId,
        roleId: appRoleId,
      })
      if (!appRole) throw appError('app-role/not-found')
    }
  }

  return {
    sourceAppId,
    appRoleId,
    orgRoleId,
    orgRoleName,
  }
}

/**
 * Persists already-selected invite roles after validating ownership and
 * entitlement. The source app is immutable here: role selection may only be
 * attached to the source app already stored on the invite.
 */
export async function setInviteAppAccessSelection(params: {
  inviteId: string
  organizationId: string
  sourceAppId?: string | null
  appRoleId?: string | null
  orgRoleId?: string | null
}): Promise<ValidatedInviteAppAccessSelection> {
  const invite = await findInviteAccessSelectionById(params.inviteId)
  if (!invite || invite.organizationId !== params.organizationId)
    throw inviteNotFound()

  if (
    params.sourceAppId !== undefined &&
    params.sourceAppId !== invite.sourceAppId
  )
    throw new AppHttpError({
      code: 'invite/app-mismatch',
      message: 'The selected app role must belong to the invite source app.',
      httpStatus: 400,
    })

  const selection = await validateInviteAppAccessSelection({
    organizationId: params.organizationId,
    sourceAppId: invite.sourceAppId,
    appRoleId: params.appRoleId,
    orgRoleId: params.orgRoleId,
  })

  const updated = await updateInviteAccessSelection(params.inviteId, {
    appRoleId: selection.appRoleId,
    orgRoleId: selection.orgRoleId,
    updatedAt: BigInt(nowUnixSeconds()),
  })
  if (!updated) throw inviteNotFound()
  return selection
}

/**
 * Re-reads and re-validates an invite's persisted access selection at accept
 * time. Role deletion or entitlement loss therefore fails closed.
 */
export async function resolveInviteAppAccessSelection(
  token: string
): Promise<ValidatedInviteAppAccessSelection> {
  const invite = await findInviteAccessSelectionByToken(token)
  if (!invite) throw inviteNotFound()

  return validateInviteAppAccessSelection({
    organizationId: invite.organizationId,
    sourceAppId: invite.sourceAppId,
    appRoleId: invite.appRoleId,
    orgRoleId: invite.orgRoleId,
  })
}

/**
 * Applies the selected source-app role after the canonical organization
 * membership lifecycle has created/reactivated the member. Idempotent for an
 * existing active app membership and safe for a previously revoked assignment.
 */
export async function applyInviteAppAccess(params: {
  organizationId: string
  userId: string
  sourceAppId?: string | null
  appRoleId?: string | null
  actorUserId?: string | null
}) {
  if (!params.sourceAppId) return null

  return ensureAppMembershipForProvisioning({
    organizationId: params.organizationId,
    userId: params.userId,
    appId: params.sourceAppId,
    appRoleId: params.appRoleId ?? null,
    actorUserId: params.actorUserId ?? null,
  })
}
