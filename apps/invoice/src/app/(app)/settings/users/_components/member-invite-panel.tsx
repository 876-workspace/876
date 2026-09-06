'use client'

import { useRouter } from 'next/navigation'

import { MemberInvitePanel } from '@876/billing-ui/panels/access/member-invite-panel'
import type { FinanceInviteSummary, FinanceRoleSummary } from '@876/billing-ui/panels/access/types'

import { client } from '@/lib/client'

export function InvoiceMemberInvitePanel({
  roles,
  invites,
  canManage,
  closeHref,
}: {
  roles: FinanceRoleSummary[]
  invites: FinanceInviteSummary[]
  canManage: boolean
  closeHref?: string
}) {
  const router = useRouter()
  return (
    <MemberInvitePanel
      roles={roles}
      invites={invites}
      canManage={canManage}
      closeHref={closeHref}
      onInvite={async ({ email, roleId }) => {
        const role = roles.find((candidate) => candidate.id === roleId)
        if (!role)
          return {
            error: {
              code: 'invoice/invalid-role',
              message: 'Choose a valid role.',
            },
          }
        const result = await client.invites.create({ email, role: role.slug })
        if (!result.error) router.refresh()
        return { error: result.error }
      }}
      onRevoke={async (inviteId) => {
        const result = await client.invites.revoke(inviteId)
        if (!result.error) router.refresh()
        return { error: result.error }
      }}
    />
  )
}
