import { fromDbUnixSeconds } from '@/platform/timestamps'

import type { Membership } from './memberships.schemas'

export type MembershipRow = {
  id: string
  organizationId: string
  userId: string
  workosMembershipId: string | null
  role: string
  roleId: string | null
  status: string
  createdAt: bigint
  updatedAt: bigint
}

export function serializeMembership(row: MembershipRow): Membership {
  return {
    object: 'membership',
    id: row.id,
    organizationId: row.organizationId,
    userId: row.userId,
    workos_membership_id: row.workosMembershipId,
    role: row.role,
    roleId: row.roleId,
    status: row.status,
    createdAt: fromDbUnixSeconds(row.createdAt),
    updatedAt: fromDbUnixSeconds(row.updatedAt),
  }
