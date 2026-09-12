import type { Metadata } from 'next'

import { AppError } from '@876/ui/app-error'
import { DetailCardSection, DetailCardSectionTitle } from '@876/ui/detail-card'
import type { FinanceMemberSummary } from '@876/billing-ui/panels/access/types'
import { create876BillingServerClient } from '@876/billing/server'

import { getInvoiceContextResult } from '@/lib/auth/context'
import { resolveInvoiceFinanceAccess } from '@/lib/auth/finance-access'
import { getInvoiceBillingConfig } from '@/lib/services/billing-config'

import { loadMember } from '../../_data'
import { loadRoles } from '../../../roles/_data'
import { FinanceMemberPanel } from '../_components/finance-member-panel'

export const metadata: Metadata = {
  title: 'Finance Access',
}

function memberName(member: { first_name?: string | null; last_name?: string | null; email?: string | null; user_id: string }) {
  return [member.first_name, member.last_name].filter(Boolean).join(' ') || member.email || member.user_id
}

export default async function MemberFinancePage({ params }: { params: Promise<{ membershipId: string }> }) {
  const { membershipId } = await params
  const context = await getInvoiceContextResult()
  if (context.status !== 'ok')
    return <AppError title="Finance role could not be loaded" error={{ code: 'invoice/unavailable', message: 'Organization context is unavailable.' }} variant="section" />
  const [access, memberResult, rolesResult] = await Promise.all([
    resolveInvoiceFinanceAccess(context.context.orgId, context.context.userId, context.context.role),
    loadMember(context.context.orgId, membershipId),
    loadRoles(context.context.orgId),
  ])
  if (access.status === 'unavailable')
    return <AppError title="Finance role could not be loaded" error={{ code: access.code, message: 'Finance access could not be verified. Try again.' }} variant="section" />
  if (!access.viewer.permissions.includes('members:read'))
    return <AppError title="Finance role could not be loaded" error={{ code: 'invoice/forbidden', message: 'You do not have permission to view finance members.' }} variant="section" />
  if (memberResult.error || !memberResult.member)
    return <AppError title="Finance role could not be loaded" error={memberResult.error ?? { code: 'invoice/member-not-found', message: 'The member could not be found.' }} variant="section" />
  if (rolesResult.error)
    return <AppError title="Finance roles could not be loaded" error={rolesResult.error} variant="section" />

  const { baseUrl } = getInvoiceBillingConfig()
  const internalKey = process.env.API_INTERNAL_KEY
  if (!internalKey)
    return <AppError title="Finance role could not be loaded" error={{ code: 'invoice/access-unavailable', message: 'Finance access could not be verified. Try again.' }} variant="section" />
  const projection = await create876BillingServerClient({ baseUrl, internalKey }).members.resolve({
    tenantId: access.viewer.tenantId,
    userId: memberResult.member.user_id,
    organizationRole: memberResult.member.role === 'super-admin' || memberResult.member.role === 'admin' ? memberResult.member.role : 'staff',
  })
  if (projection.error || !projection.data)
    return <AppError title="Finance role could not be loaded" error={projection.error ?? { code: 'billing/member-not-found', message: 'The member does not have finance access.' }} variant="section" />

  const target: FinanceMemberSummary = {
    id: memberResult.member.user_id,
    userId: memberResult.member.user_id,
    name: memberName(memberResult.member),
    email: memberResult.member.email ?? memberResult.member.user_id,
    avatarUrl: memberResult.member.avatar ?? null,
    roleId: projection.data.role.id,
    roleName: projection.data.role.name,
    status: projection.data.status,
  }
  const canManage = access.viewer.permissions.includes('members:write') && context.context.userId !== target.userId
  return (
    <DetailCardSection>
      <DetailCardSectionTitle>Finance role</DetailCardSectionTitle>
      <FinanceMemberPanel member={target} roles={rolesResult.roles} canManage={canManage} />
    </DetailCardSection>
  )
}