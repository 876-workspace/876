import { isAppHttpError } from '@/http/errors'
import { getLogger } from '@/platform/logger'
import { OWNER_ROLE_NAME } from '@/platform/permissions'

/**
 * Keeps the identity provider (WorkOS) in step with local lifecycle writes.
 *
 * Every local user, organization, and membership row mirrors a WorkOS record.
 * When a local record goes, the provider record must go with it — otherwise
 * WorkOS accumulates accounts that can still authenticate but have no local
 * counterpart, which is the drift Console surfaces as "out of sync".
 *
 * Every helper here is **idempotent**: a record already gone at the provider is
 * treated as success, so a retry or a reconciliation pass converges rather than
 * failing.
 *
 * **Ordering contract for callers: write locally, then call these.** A provider
 * failure then raises and the local write is rolled back, leaving both systems
 * untouched. The reverse order can delete at WorkOS and keep the local row.
 */

const log = getLogger('identity-sync')

/** WorkOS reports "already gone" as 404, which is the outcome the caller wanted. */
const ALREADY_GONE_STATUS = 404

/**
 * WorkOS ships `admin` and `member` in every environment. Only owner is mapped
 * explicitly; anything else takes the environment default, so a custom 876 org
 * role can never fail the call with a slug WorkOS has never heard of.
 */
const PROVIDER_ADMIN_ROLE_SLUG = 'admin'

/** The provider surface these helpers need — not the whole adapter. */
export type IdentitySyncProvider = {
  createOrganizationMembership(params: {
    userId: string
    organizationId: string
    roleSlug?: string | null
  }): Promise<Record<string, unknown>>
  listOrganizationMemberships(filters: {
    organizationId?: string | null
    userId?: string | null
  }): Promise<Record<string, unknown>[]>
  deleteOrganizationMembership(membershipId: string): Promise<void>
  deleteUser(userId: string): Promise<void>
  deleteOrganization(organizationId: string): Promise<void>
}

function isAlreadyGone(error: unknown): boolean {
  return isAppHttpError(error) && error.httpStatus === ALREADY_GONE_STATUS
}

/**
 * Create the WorkOS membership mirroring a local one.
 *
 * Returns the provider membership id, or `null` when either side has no
 * provider record to link — a local-only org, for instance one seeded before
 * WorkOS existed. An existing provider membership is **adopted** rather than
 * duplicated, so a retry converges instead of raising a conflict.
 */
export async function ensureProviderMembership(
  provider: IdentitySyncProvider,
  params: {
    workosOrganizationId: string | null
    workosUserId: string | null
    role: string
  }
): Promise<string | null> {
  if (!params.workosOrganizationId || !params.workosUserId) {
    log.info(
      {
        workos_organization_id: params.workosOrganizationId,
        workos_user_id: params.workosUserId,
      },
      'identity_sync.membership.no_provider_record'
    )
    return null
  }

  const roleSlug =
    params.role === OWNER_ROLE_NAME ? PROVIDER_ADMIN_ROLE_SLUG : null

  let created: Record<string, unknown>
  try {
    created = await provider.createOrganizationMembership({
      userId: params.workosUserId,
      organizationId: params.workosOrganizationId,
      roleSlug,
    })
  } catch (error) {
    const existing = await findProviderMembership(provider, {
      workosOrganizationId: params.workosOrganizationId,
      workosUserId: params.workosUserId,
    })
    if (existing === null) throw error

    log.info(
      {
        workos_membership_id: existing,
        workos_organization_id: params.workosOrganizationId,
        workos_user_id: params.workosUserId,
      },
      'identity_sync.membership.adopted'
    )
    return existing
  }

  const membershipId = String(created.id)
  log.info(
    {
      workos_membership_id: membershipId,
      workos_organization_id: params.workosOrganizationId,
      workos_user_id: params.workosUserId,
    },
    'identity_sync.membership.created'
  )
  return membershipId
}

async function findProviderMembership(
  provider: IdentitySyncProvider,
  params: { workosOrganizationId: string; workosUserId: string }
): Promise<string | null> {
  const memberships = await provider.listOrganizationMemberships({
    organizationId: params.workosOrganizationId,
    userId: params.workosUserId,
  })

  return memberships.length > 0 ? String(memberships[0]?.id) : null
}

/** Delete the WorkOS user backing a local account. True when a call landed. */
export async function deleteProviderUser(
  provider: IdentitySyncProvider,
  workosUserId: string | null,
  params: { localUserId: string }
): Promise<boolean> {
  if (!workosUserId) {
    log.info(
      { user_id: params.localUserId },
      'identity_sync.user.no_provider_record'
    )
    return false
  }

  try {
    await provider.deleteUser(workosUserId)
  } catch (error) {
    if (!isAlreadyGone(error)) throw error

    log.info(
      { user_id: params.localUserId, workos_user_id: workosUserId },
      'identity_sync.user.already_absent'
    )
    return false
  }

  log.info(
    { user_id: params.localUserId, workos_user_id: workosUserId },
    'identity_sync.user.deleted'
  )
  return true
}

/** Delete the WorkOS organization backing a local org. True when a call landed. */
export async function deleteProviderOrganization(
  provider: IdentitySyncProvider,
  workosOrganizationId: string | null,
  params: { localOrganizationId: string }
): Promise<boolean> {
  if (!workosOrganizationId) {
    log.info(
      { organization_id: params.localOrganizationId },
      'identity_sync.organization.no_provider_record'
    )
    return false
  }

  try {
    await provider.deleteOrganization(workosOrganizationId)
  } catch (error) {
    if (!isAlreadyGone(error)) throw error

    log.info(
      {
        organization_id: params.localOrganizationId,
        workos_organization_id: workosOrganizationId,
      },
      'identity_sync.organization.already_absent'
    )
    return false
  }

  log.info(
    {
      organization_id: params.localOrganizationId,
      workos_organization_id: workosOrganizationId,
    },
    'identity_sync.organization.deleted'
  )
  return true
}

/** Delete the WorkOS membership backing a local one. True when a call landed. */
export async function deleteProviderMembership(
  provider: IdentitySyncProvider,
  workosMembershipId: string | null,
  params: { localMembershipId: string }
): Promise<boolean> {
  if (!workosMembershipId) {
    log.info(
      { membership_id: params.localMembershipId },
      'identity_sync.membership.no_provider_record'
    )
    return false
  }

  try {
    await provider.deleteOrganizationMembership(workosMembershipId)
  } catch (error) {
    if (!isAlreadyGone(error)) throw error

    log.info(
      {
        membership_id: params.localMembershipId,
        workos_membership_id: workosMembershipId,
      },
      'identity_sync.membership.already_absent'
    )
    return false
  }

  log.info(
    {
      membership_id: params.localMembershipId,
      workos_membership_id: workosMembershipId,
    },
    'identity_sync.membership.deleted'
  )
  return true
}

/**
 * Best-effort rollback of a WorkOS user created earlier in a failed request.
 *
 * **Never throws.** It runs inside a `catch` that is about to re-raise the
 * original failure, and letting a compensation error escape would replace the
 * real cause with a confusing one. A compensation that fails leaves an orphan
 * for the reconciler, which is the lesser problem.
 */
export async function compensateProviderUser(
  provider: IdentitySyncProvider,
  workosUserId: string,
  params: { operation: string }
): Promise<void> {
  try {
    await provider.deleteUser(workosUserId)
    log.info(
      {
        resource: 'user',
        operation: params.operation,
        workos_user_id: workosUserId,
      },
      'identity_sync.compensated'
    )
  } catch (error) {
    log.warn(
      {
        err: error,
        resource: 'user',
        operation: params.operation,
        workos_user_id: workosUserId,
      },
      'identity_sync.compensation_failed'
    )
  }
}
