'use client'

import { useRouter } from 'next/navigation'

import { MembersTablePanel } from '@876/billing-ui/panels/access/members-table-panel'
import type { FinanceMemberSummary, FinanceRoleSummary } from '@876/billing-ui/panels/access/types'

import { client } from '@/lib/client'

export function FinanceMemberPanel({ member, roles, canManage }: { member: FinanceMemberSummary; roles: FinanceRoleSummary[]; canManage: boolean }) {
  const router = useRouter()
  async function update(userId: string, roleId: string, status: FinanceMemberSummary['status']) {
    const result = await client.members.update(userId, { roleId, status })
    if (!result.error) router.refresh()
    return { error: result.error }
  }
  return (
    <MembersTablePanel
      members={[member]}
      roles={roles}
      canManage={canManage}
      onChangeRole={(userId, roleId) => update(userId, roleId, member.status)}
      onChangeStatus={(userId, status) => update(userId, member.roleId, status)}
    />
  )
}
