import { Suspense, type ReactNode } from 'react'
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getWorkspaceContext } from '@/lib/auth/billing-context'
import { UsersListData } from './_components/users-list-data'
import { UsersListSkeleton } from './_components/users-list-skeleton'
import { UsersShell } from './_components/users-shell'

export const metadata: Metadata = {
  title: 'Users',
}

export default async function UsersLayout({
  children,
}: {
  children: ReactNode
}) {
  const context = await getWorkspaceContext()
  if (!context) redirect('/login')
  if (!context.permissions.includes('members:read'))
    redirect('/no-access?reason=permission')
  return (
    <UsersShell
      canInvite={context.permissions.includes('members:write')}
      list={
        <Suspense fallback={<UsersListSkeleton />}>
          <UsersListData
            orgId={context.orgId}
            tenantId={context.tenant.id}
            canManage={context.permissions.includes('members:write')}
          />
        </Suspense>
      }
    >
      {children}
    </UsersShell>
  )
}
