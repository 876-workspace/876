'use client'

import { useSearchParams } from 'next/navigation'

import { RolesListPanel } from '@876/billing-ui/panels/access/roles-list-panel'
import type { FinanceRoleSummary } from '@876/billing-ui/panels/access/types'

export function RolesList({ roles }: { roles: FinanceRoleSummary[] }) {
  const type = useSearchParams().get('type')
  const typeFilter =
    type === 'system' || type === 'custom' || type === 'all' ? type : 'all'

  return (
    <RolesListPanel
      roles={roles}
      state={{ status: 'ready' }}
      detailHref={(roleId) => `/settings/roles/${encodeURIComponent(roleId)}`}
      typeFilter={typeFilter}
    />
  )
}
