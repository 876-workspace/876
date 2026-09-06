import { getInvoiceContextResult } from '@/lib/auth/context'
import { resolveInvoiceFinanceAccess } from '@/lib/auth/finance-access'
import { getWorkspace } from '@/lib/services/workspace'

import { loadRoles } from '../../roles/_data'
import { InvoiceMemberInvitePanel } from '../_components/member-invite-panel'

export const metadata = { title: 'Invite member - Invoice settings' }

export default async function InviteMemberPage() {
  const context = await getInvoiceContextResult()
  if (context.status !== 'ok') return null
  const workspace = await getWorkspace()
  const [access, rolesResult, invitesResult] = await Promise.all([
    resolveInvoiceFinanceAccess(context.context.orgId, context.context.userId, context.context.role),
    loadRoles(context.context.orgId),
    workspace.invites.list(context.context.orgId),
  ])
  const roles = rolesResult.roles
  return (
    <InvoiceMemberInvitePanel
      roles={roles}
      invites={(invitesResult.data?.data ?? []).map((invite) => {
        const role = roles.find((candidate) => candidate.slug === invite.role)
        return { id: invite.id, email: invite.email, roleId: role?.id ?? invite.role, roleName: role?.name ?? invite.role, expiresAt: invite.expires_at ?? null }
      })}
      canManage={access.status === 'ok' && access.viewer.permissions.includes('members:write')}
    />
  )
}
