import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'

import { AppError } from '@876/ui/app-error'

import { getInvoiceContextResult } from '@/lib/auth/context'
import { resolveInvoiceFinanceAccess } from '@/lib/auth/finance-access'

import { toFinanceMemberSummaries } from '@876/billing-ui/panels/access/member-identity'
import type { FinanceMemberSummary } from '@876/billing-ui/panels/access/types'

import { RoleSection } from '../_components/roles-section'
import { loadFinanceMembers, loadRole } from '../_data'
import { loadUsers } from '../../users/_data'

export const metadata: Metadata = {
  title: 'Role Details',
}

export default async function RoleDetailPage({ params }: { params: Promise<{ roleId: string }> }) {
  const context = await getInvoiceContextResult()
  if (context.status !== 'ok') redirect('/no-access')
  const access = await resolveInvoiceFinanceAccess(context.context.orgId, context.context.userId, context.context.role)
  if (access.status !== 'ok' || !access.viewer.permissions.includes('roles:read')) redirect('/no-access')
  const { roleId } = await params
  const [{ role, error }, roster, users] = await Promise.all([
    loadRole(context.context.orgId, roleId),
    loadFinanceMembers(context.context.orgId),
    loadUsers(context.context.orgId),
  ])
  if (error) return <AppError title="Role could not be loaded" error={error} variant="section" />
  if (!role) notFound()
  const members: FinanceMemberSummary[] = toFinanceMemberSummaries(
    roster.members
      .filter((member) => member.roleId === role.id)
      .map((member) => ({
        userId: member.userId,
        roleId: member.roleId,
        roleName: member.role.name,
        status: member.status,
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
    <RoleSection
      role={role}
      canManage={access.viewer.permissions.includes('roles:write')}
      members={members}
    />
  )
}