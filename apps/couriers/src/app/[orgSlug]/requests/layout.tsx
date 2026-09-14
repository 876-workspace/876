import { Suspense, type ReactNode } from 'react'

import { Page } from '@876/ui/page'
import { Skeleton } from '@876/ui/skeleton'
import { RequestListDetailShell } from '@876/crm-ui/request-list-detail-shell'

import { RequestsListData } from './_components/requests-list-data'

export const metadata = { title: 'Requests' }

export default async function RequestsLayout({
  children,
  params,
}: {
  children: ReactNode
  params: Promise<{ orgSlug: string }>
}) {
  const { orgSlug } = await params
  const baseHref = `/${orgSlug}/requests`

  return (
    <Page className="h-full min-h-0 p-0">
      <RequestListDetailShell
        baseHref={baseHref}
        list={
          <Suspense fallback={<Skeleton className="h-56 w-full" />}>
            <RequestsListData orgSlug={orgSlug} />
          </Suspense>
        }
      >
        {children}
      </RequestListDetailShell>
    </Page>
  )
}
