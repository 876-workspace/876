'use client'

import { useRouter } from 'next/navigation'

import { MemberInvitePanel } from '@876/billing-ui/panels/access/member-invite-panel'
import type {
  FinanceInviteSummary,
  FinanceRoleSummary,
} from '@876/billing-ui/panels/access/types'

import { client } from '@/lib/client'

type Props = {
  roles: FinanceRoleSummary[]
  invites: FinanceInviteSummary[]
  canManage: boolean
  closeHref?: string
}

export function BillingMemberInvitePanel({
  roles,
  invites,
  canManage,
  closeHref,
}: Props) {
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
              code: 'billing/invalid-role',
              message: 'Choose a valid role.',
            },
          }

        const result = await client.invites.create({ email, role: role.slug })
        if (result.error) return { error: result.error }
        if (!result.data)
          return {
            error: {
              code: 'billing/invite-failed',
              message: 'The invitation could not be sent.',
            },
          }

        router.refresh()
        return { error: null }
      }}
      onRevoke={async (inviteId) => {
        const result = await client.invites.revoke(inviteId)
        if (result.error) return { error: result.error }
        if (!result.data)
          return {
            error: {
              code: 'billing/invite-revoke-failed',
              message: 'The invitation could not be revoked.',
            },
          }

        router.refresh()
        return { error: null }
      }}
    />
  )
}
