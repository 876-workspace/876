import { Skeleton } from '@876/ui/skeleton'
import type { Metadata } from 'next'
import { Suspense } from 'react'

import { PageBreadcrumb } from '@/components/page-breadcrumb'
import {
  requireAppAccess,
  requireProjectsContext,
} from '@/lib/auth/require-projects-context'
import { EventDetailData } from './_components/event-detail-data'

export const metadata: Metadata = { title: 'Event' }

type Props = { params: Promise<{ eventId: string }> }

export default async function EventDetailPage({ params }: Props) {
  await requireAppAccess({ module: 'projects', permission: 'projects.view' })
  const { orgId, userId } = await requireProjectsContext()

  return (
    <div className="px-4 pt-5 pb-8 sm:px-6 lg:px-8">
      <PageBreadcrumb href="/calendar" label="Calendar" className="mb-4" />
      <Suspense fallback={<Skeleton className="h-64 w-full rounded-xl" />}>
        <EventDetailDataFromParams
          orgId={orgId}
          userId={userId}
          params={params}
        />
      </Suspense>
    </div>
  )
}

async function EventDetailDataFromParams({
  orgId,
  userId,
  params,
}: {
  orgId: string
  userId: string
  params: Props['params']
}) {
  const { eventId } = await params
  return (
    <EventDetailData
      orgId={orgId}
      userId={userId}
      eventId={decodeURIComponent(eventId)}
    />
  )
}
