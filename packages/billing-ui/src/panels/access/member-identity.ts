import type { FinanceMemberSummary } from './types'

/**
 * The identity fields a finance member is displayed with.
 *
 * The finance plane stores an opaque 876 account id and nothing else — names,
 * emails and avatars belong to the identity plane and are resolved there
 * (`.claude/rules/platform-services.md`). A host therefore joins its
 * organization roster onto the workspace grants before rendering; without the
 * join a members table shows raw `user_…` ids.
 */
export type MemberIdentity = {
  userId: string
  firstName: string | null
  lastName: string | null
  email: string | null
  avatarUrl: string | null
}

export type FinanceGrant = {
  userId: string
  roleId: string
  roleName: string
  status: 'ACTIVE' | 'SUSPENDED'
  joinedAt?: number | null
}

/**
 * Joins workspace grants onto organization identities.
 *
 * A grant whose account is no longer in the roster is kept, not dropped: it is
 * a real grant, and silently hiding it would make a stale permission invisible
 * to the person who has to revoke it. It falls back to the account id, which is
 * the only truthful label available.
 */
export function toFinanceMemberSummaries(
  grants: readonly FinanceGrant[],
  identities: readonly MemberIdentity[]
): FinanceMemberSummary[] {
  const byUserId = new Map(
    identities.map((identity) => [identity.userId, identity])
  )

  return grants.map((grant) => {
    const identity = byUserId.get(grant.userId)
    const name =
      [identity?.firstName, identity?.lastName].filter(Boolean).join(' ') ||
      identity?.email ||
      grant.userId

    return {
      id: grant.userId,
      userId: grant.userId,
      name,
      email: identity?.email ?? '',
      avatarUrl: identity?.avatarUrl ?? null,
      joinedAt: grant.joinedAt ?? null,
      roleId: grant.roleId,
      roleName: grant.roleName,
      status: grant.status,
    }
  })
}
