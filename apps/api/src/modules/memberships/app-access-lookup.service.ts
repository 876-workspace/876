import * as repository from './memberships.repository'
import type { Membership } from './memberships.schemas'
import { serializeMembership } from './memberships.serializers'

export async function findMembershipForAccess(
  organizationId: string,
  userId: string
): Promise<Membership | null> {
  const row = await repository.findMembershipByOrgAndUser(organizationId, userId)
  return row ? serializeMembership(row) : null
}

export async function findMembershipForAccessById(
  organizationId: string,
  membershipId: string
): Promise<Membership | null> {
  const row = await repository.findMembershipById(membershipId)
  if (!row || row.organizationId !== organizationId) return null
  return serializeMembership(row)
}

export async function listMembershipsForAccess(
  organizationId: string,
  userIds: readonly string[]
): Promise<Membership[]> {
  const ids = [...new Set(userIds)]
  if (ids.length === 0) return []
  const rows = await repository.findMembershipsByOrgAndUsers(organizationId, ids)
  return rows.map(serializeMembership)
}
