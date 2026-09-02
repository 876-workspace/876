import { Suspense, type ReactNode } from 'react'
import { notFound } from 'next/navigation'

import { resolveCrmAccessViewer } from '@/lib/auth/app-access'
import { requireCrmContext } from '@/lib/auth/require-crm-context'

import { UsersListData } from './_components/users-list-data'
import { UsersListSkeleton } from './_components/users-list-skeleton'
import { UsersShell } from './_components/users-shell'

export default async function UsersLayout({
  children,
}: {
  children: ReactNode
}) {
  const context = await requireCrmContext()
  const viewer = await resolveCrmAccessViewer(context.orgId)
  if (!viewer?.canReadMembers) notFound()
  return (
    <UsersShell
      list={
        <Suspense fallback={<UsersListSkeleton />}>
          <UsersListData orgId={context.orgId} />
        </Suspense>
      }
    >
      {children}
    </UsersShell>
  )
}
