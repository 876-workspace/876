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
    organization_id: row.organizationId,
    user_id: row.userId,
    workos_membership_id: row.workosMembershipId,
    role: row.role,
    role_id: row.roleId,
    status: row.status,
    created_at: fromDbUnixSeconds(row.createdAt),
    updated_at: fromDbUnixSeconds(row.updatedAt),
  }
}
