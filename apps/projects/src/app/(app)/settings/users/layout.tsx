import { Suspense, type ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { AppError } from '@876/ui/app-error'

import { resolveCrmAccessViewer } from '@/lib/auth/app-access'
import {
  requireAppPermission,
  requireProjectsContext,
} from '@/lib/auth/require-projects-context'

import { UsersListData } from './_components/users-list-data'
import { UsersListSkeleton } from './_components/users-list-skeleton'
import { UsersShell } from './_components/users-shell'

export default async function UsersLayout({
  children,
}: {
  children: ReactNode
}) {
  await requireAppPermission('members.view')
  const context = await requireProjectsContext()
  const outcome = await resolveCrmAccessViewer(context.orgId)

  // An outage is not a denial. Saying "not found" for either would tell the
  // operator something untrue and give them nothing to act on.
  if (outcome.status === 'unavailable')
    return (
      <UsersShell list={null}>
        <AppError
          title="Access could not be verified"
          error={{
            code: outcome.code,
            message:
              'Member access is temporarily unavailable. Try again shortly.',
          }}
          variant="banner"
          showCode
        />
      </UsersShell>
    )

  if (!outcome.viewer.canReadMembers) redirect('/no-access')

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
