'use client'

import { useRouter } from 'next/navigation'

import {
  financePermissionSurface,
  mergeFinancePermissions,
  partitionFinancePermissions,
  withImpliedFinancePermissions,
} from '@876/core/access/finance-catalog'
import { RoleCardPanel } from '@876/billing-ui/panels/access/role-card-panel'
import { RoleFormPanel } from '@876/billing-ui/panels/access/role-form-panel'
import { RoleMembersPanel } from '@876/billing-ui/panels/access/role-members-panel'
import type {
  FinanceActionResult,
  FinanceMemberSummary,
} from '@876/billing-ui/panels/access/types'

import { client } from '@/lib/client'
import { formatDate } from '@/lib/format'
import {
  RoleCreateSchema,
  RoleUpdateSchema,
  type RoleResource,
} from '@/types/access'

const surface = financePermissionSurface('billing')
const closeHref = '/settings/roles'

function invalidRoleResult(): FinanceActionResult {
  return {
    error: {
      code: 'billing/invalid-role',
      message: 'The role details are invalid.',
    },
  }
}

export function CreateRolePanel() {
  const router = useRouter()

  return (
    <RoleFormPanel
      surface={surface}
      closeHref={closeHref}
      onCreate={async (params) => {
        const parsed = RoleCreateSchema.safeParse({
          ...params,
          permissions: withImpliedFinancePermissions(params.permissions),
        })
        if (!parsed.success) return invalidRoleResult()

        const result = await client.roles.create(parsed.data)
        if (result.error) return { error: result.error }
        if (!result.data) return invalidRoleResult()

        router.push(`/settings/roles/${encodeURIComponent(result.data.id)}`)
        router.refresh()
        return { error: null }
      }}
    />
  )
}

export function EditRolePanel({
  role,
  canManage,
  members,
}: {
  role: RoleResource
  canManage: boolean
  members?: FinanceMemberSummary[]
}) {
  const router = useRouter()
  const { external } = partitionFinancePermissions(role.permissions, surface)

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
            memberHref={(userId) =>
              `/settings/users/${encodeURIComponent(userId)}`
            }
            formatDate={formatDate}
          />
        ) : undefined
      }
      onSave={async (params) => {
        const parsed = RoleUpdateSchema.safeParse({
          ...params,
          permissions: mergeFinancePermissions(
            withImpliedFinancePermissions(params.permissions),
            external
          ),
        })
        if (!parsed.success) return invalidRoleResult()

        const result = await client.roles.update(role.id, parsed.data)
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
