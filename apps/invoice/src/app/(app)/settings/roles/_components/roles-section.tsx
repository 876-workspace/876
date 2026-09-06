'use client'

import type { ReactNode } from 'react'

import { useRouter } from 'next/navigation'

import {
  financePermissionSurface,
  withImpliedFinancePermissions,
} from '@876/core/access/finance-catalog'
import { RoleCardPanel } from '@876/billing-ui/panels/access/role-card-panel'
import { RoleFormPanel } from '@876/billing-ui/panels/access/role-form-panel'
import { RoleMembersPanel } from '@876/billing-ui/panels/access/role-members-panel'
import { RolesShell } from '@876/billing-ui/panels/access/roles-shell'
import type {
  FinanceActionResult,
  FinanceMemberSummary,
  FinanceRoleSummary,
} from '@876/billing-ui/panels/access/types'

import { client } from '@/lib/client'
import { formatDate } from '@/lib/format'

const surface = financePermissionSurface('invoice')
const closeHref = '/settings/roles'

function invalidRoleResult(): FinanceActionResult {
  return { error: { code: 'invoice/invalid-role', message: 'The role details are invalid.' } }
}

export function InvoiceRolesShell({ children, list, canCreate }: { children: React.ReactNode; list: React.ReactNode; canCreate: boolean }) {
  return (
    <div className="h-full min-h-0">
      <RolesShell title="Roles" newHref="/settings/roles/new" canCreate={canCreate} list={list}>
        {children}
      </RolesShell>
    </div>
  )
}

export function CreateRoleSection() {
  const router = useRouter()
  return (
    <RoleFormPanel
      surface={surface}
      closeHref={closeHref}
      onCreate={async (params) => {
        const result = await client.roles.create({
          ...params,
          permissions: withImpliedFinancePermissions(params.permissions),
        })
        if (result.error) return { error: result.error }
        if (!result.data) return invalidRoleResult()
        router.push(`/settings/roles/${encodeURIComponent(result.data.id)}`)
        router.refresh()
        return { error: null }
      }}
    />
  )
}

export function RoleSection({
  role,
  canManage,
  members,
}: {
  role: FinanceRoleSummary
  canManage: boolean
  members?: FinanceMemberSummary[]
}) {
  const router = useRouter()
  return (
    <RoleCardPanel
      role={role}
      surface={surface}
      canManage={canManage}
      closeHref={closeHref}
      members={
        members ? (
          <RoleMembersPanel
            members={members}
            state={{ status: 'ready' }}
            memberHref={(userId) => `/settings/users?member=${encodeURIComponent(userId)}`}
            formatDate={formatDate}
          />
        ) : undefined
      }
      onSave={async (params) => {
        const result = await client.roles.update(role.id, {
          ...params,
          permissions: withImpliedFinancePermissions(params.permissions),
        })
        if (result.error) return { error: result.error }
        router.refresh()
        return { error: null }
      }}
      onDelete={async () => {
        const result = await client.roles.delete(role.id)
        if (result.error) return { error: result.error }
        if (!result.data) return invalidRoleResult()
        router.push(closeHref)
        router.refresh()
        return { error: null }
      }}
    />
  )
}
