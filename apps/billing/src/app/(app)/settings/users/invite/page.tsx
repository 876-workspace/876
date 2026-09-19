
import { requirePagePermission } from '@/lib/auth/billing-context'
import { service } from '@/lib/service'
import { getPlatformClient } from '@/lib/clients/platform'

import { BillingMemberInvitePanel } from '../_components/member-invite-panel'

export const metadata = { title: 'Invite member - Billing settings' }

export default async function InviteMemberPage() {
  const context = await requirePagePermission('members:write')
  const platform = await getPlatformClient()
  const [roles, invites] = await Promise.all([
    service.roles.list(context.tenant.id),
    platform.invites.list(context.orgId),
  ])

  const pendingInvites = invites.data?.data ?? []

  return (
    <BillingMemberInvitePanel
      roles={roles}
      invites={pendingInvites.map((invite) => {
        const role = roles.find(
          (candidate) =>
            candidate.id === invite.role || candidate.slug === invite.role
        )

        return {
          id: invite.id,
          email: invite.email,
          roleId: role?.id ?? invite.role,
          roleName: role?.name ?? invite.role,
          expiresAt: invite.expires_at ?? null,
        }
      })}
      canManage={context.permissions.includes('members:write')}
    />
  )
}
