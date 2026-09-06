'use client'

import { useRouter } from 'next/navigation'

import { MembersTablePanel } from '@876/billing-ui/panels/access/members-table-panel'
import type {
  FinanceMemberSummary,
  FinanceRoleSummary,
} from '@876/billing-ui/panels/access/types'

import { client } from '@/lib/client'

type Props = {
  members: FinanceMemberSummary[]
  roles: FinanceRoleSummary[]
  canManage: boolean
}

export function BillingMembersTablePanel({ members, roles, canManage }: Props) {
  const router = useRouter()
  const membersById = new Map(members.map((member) => [member.id, member]))

  async function update(
    memberId: string,
    next: { roleId: string; status: FinanceMemberSummary['status'] }
  ) {
    const result = await client.members.update(memberId, next)
    if (result.error) return { error: result.error }
    if (!result.data)
      return {
        error: {
          code: 'billing/member-update-failed',
          message: 'The member could not be updated.',
        },
      }

    router.refresh()
    return { error: null }
  }

  return (
    <MembersTablePanel
      members={members}
      roles={roles}
      canManage={canManage}
      onChangeRole={(memberId, roleId) => {
        const member = membersById.get(memberId)
        if (!member)
          return Promise.resolve({
            error: {
              code: 'billing/member-not-found',
              message: 'The member could not be found.',
            },
          })

        return update(memberId, { roleId, status: member.status })
      }}
      onChangeStatus={(memberId, status) => {
        const member = membersById.get(memberId)
        if (!member)
          return Promise.resolve({
            error: {
              code: 'billing/member-not-found',
              message: 'The member could not be found.',
            },
          })

        return update(memberId, { roleId: member.roleId, status })
      }}
    />
  )
}
