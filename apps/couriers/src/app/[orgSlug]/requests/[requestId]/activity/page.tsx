import { Suspense } from 'react'

import { getError, toAppError } from '@876/core'
import { AppError } from '@876/ui/app-error'
import { Skeleton } from '@876/ui/skeleton'

import { RequestEventsClient } from '../../_components/request-events-client'
import { getManageContext } from '@/lib/auth/manage-context'
import { crm } from '@/lib/services/crm'

export const metadata = { title: 'Request activity' }

export default function RequestActivityPage({
  params,
}: {
  params: Promise<{ orgSlug: string; requestId: string }>
}) {
  return (
    <Suspense fallback={<Skeleton className="h-56 w-full" />}>
      <ActivityData params={params} />
    </Suspense>
  )
}

async function ActivityData({
  params,
}: {
  params: Promise<{ orgSlug: string; requestId: string }>
}) {
  const { orgSlug, requestId } = await params
  const context = await getManageContext(orgSlug)
  if (!context)
    return (
      <AppError
        title="Activity could not be loaded"
        error={toAppError(getError('auth/forbidden'))}
        variant="inline"
      />
    )

  const result = await crm.requestEvents.list(context.orgId, requestId)
  if (result.error)
    return (
      <AppError
        title="Activity could not be loaded"
        error={toAppError(getError(result.error.code))}
        variant="inline"
      />
    )

  return (
    <RequestEventsClient
      orgSlug={orgSlug}
      requestId={requestId}
      events={result.data.data}
    />
  )
}
