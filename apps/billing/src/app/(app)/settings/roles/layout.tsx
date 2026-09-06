import { Suspense, type ReactNode } from 'react'

import { RolesShell } from '@876/billing-ui/panels/access/roles-shell'

import { requirePagePermission } from '@/lib/auth/billing-context'

import { RolesListData } from './_components/roles-list-data'

export default async function RolesLayout({
  children,
}: {
  children: ReactNode
}) {
  const context = await requirePagePermission('roles:read')

  return (
    <RolesShell
      title="Roles"
      newHref="/settings/roles/new"
      canCreate={context.permissions.includes('roles:write')}
      list={
        <Suspense fallback={<div className="h-full min-h-0" />}>
          <RolesListData tenantId={context.tenant.id} />
        </Suspense>
      }
    >
      {children}
    </RolesShell>
  )
}
