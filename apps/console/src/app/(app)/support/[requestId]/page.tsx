import { Page, PageBreadcrumb } from '@876/ui/page'
import { Skeleton } from '@876/ui/skeleton'
import { Suspense } from 'react'
import { notFound } from 'next/navigation'

import { PlatformOrganizationUnavailable } from '@/features/support/components/platform-organization-unavailable'
import { RequestManager } from '@/features/support/components/request-manager'
import { $876 } from '@/lib/876'
import { requireSession } from '@/lib/auth/guards'
import { getPlatformOrganization } from '@/lib/platform-org'

type Props = {
  params: Promise<{ requestId: string }>
}

export default function SupportRequestDetailPage({ params }: Props) {
  return (
    <Page>
      <div className="space-y-5">
        <Suspense fallback={<DetailFallback />}>
          <RequestData params={params} />
        </Suspense>
      </div>
    </Page>
  )
}

async function RequestData({ params }: Props) {
  const { requestId } = await params
  const [org, session] = await Promise.all([
    getPlatformOrganization(),
    requireSession(`/support/${requestId}`),
  ])
  if (!org) return <PlatformOrganizationUnavailable />

  const [requestResult, tasksResult, remindersResult, notesResult] =
    await Promise.all([
      $876.requests.retrieve(org.id, requestId),
      $876.requestTasks.list(org.id, requestId),
      $876.requestReminders.list(org.id, requestId),
      $876.requestNotes.list(org.id, requestId),
    ])

  if (requestResult.error?.code === 'crm/request-not-found') notFound()
  if (requestResult.error) throw new Error(requestResult.error.message)
  if (tasksResult.error) throw new Error(tasksResult.error.message)
  if (remindersResult.error) throw new Error(remindersResult.error.message)
  if (notesResult.error) throw new Error(notesResult.error.message)

  return (
    <>
      <PageBreadcrumb href="/support" label="Requests" className="mb-4" />
      <RequestManager
        organizationId={org.id}
        currentUserId={session.id}
        request={requestResult.data}
        tasks={tasksResult.data.data}
        reminders={remindersResult.data.data}
        notes={notesResult.data.data}
      />
    </>
  )
}

function DetailFallback() {
  return (
    <div className="space-y-5">
      <Skeleton className="h-4 w-24" />
      <div className="876-card space-y-4 p-5">
        <Skeleton className="h-6 w-72" />
        <Skeleton className="h-9 w-full" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }, (_, index) => (
            <Skeleton key={index} className="h-10" />
          ))}
        </div>
      </div>
      <div className="grid gap-5 xl:grid-cols-2">
        <Skeleton className="h-64 rounded-lg" />
        <Skeleton className="h-64 rounded-lg" />
      </div>
      <Skeleton className="h-72 rounded-lg" />
    </div>
  )
}
