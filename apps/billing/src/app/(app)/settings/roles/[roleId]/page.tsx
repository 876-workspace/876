import { notFound } from 'next/navigation'

import { toFinanceMemberSummaries } from '@876/billing-ui/panels/access/member-identity'
import type { FinanceMemberSummary } from '@876/billing-ui/panels/access/types'

import { requirePagePermission } from '@/lib/auth/billing-context'

import { EditRolePanel } from '../_components/role-panels'
import { loadBillingMembers, loadUsers } from '../../users/_data'
import { loadRole } from '../_data'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ roleId: string }>
}) {
  const { roleId } = await params
  return { title: `${roleId} - Billing role` }
}

export default async function RoleDetailPage({
  params,
}: {
  params: Promise<{ roleId: string }>
}) {
  const context = await requirePagePermission('roles:read')
  const { roleId } = await params
  const [role, roster, users] = await Promise.all([
    loadRole(context.tenant.id, roleId),
    loadBillingMembers(context.tenant.id),
    loadUsers(context.orgId),
  ])
  if (!role) notFound()

  const members: FinanceMemberSummary[] = toFinanceMemberSummaries(
    roster.members
      .filter((m) => m.roleId === role.id)
      .map((m) => ({
        userId: m.userId,
        roleId: m.roleId,
        roleName: m.roleName,
        status: m.status,
      })),
    users.members.map((u) => ({
      userId: u.user_id,
      firstName: u.first_name,
      lastName: u.last_name,
      email: u.email,
      avatarUrl: u.avatar,
    }))
  )

  return (
    <EditRolePanel
      role={role}
      canManage={context.permissions.includes('roles:write')}
      members={members}
    />
  )
}
