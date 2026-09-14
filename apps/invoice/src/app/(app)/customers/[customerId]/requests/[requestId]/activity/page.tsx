import { Suspense } from 'react'

import { AppError } from '@876/ui/app-error'
import { Skeleton } from '@876/ui/skeleton'

import { RequestEventsClient } from '@/features/crm/request-events-client'
import { getInvoiceContext } from '@/lib/auth/context'
import { requireAppPermission } from '@/lib/auth/guards'
import { getCrm } from '@/lib/services/crm'

export const metadata = { title: 'Request activity' }

export default function CustomerRequestActivityPage({
  params,
}: {
  params: Promise<{ customerId: string; requestId: string }>
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
  params: Promise<{ customerId: string; requestId: string }>
}) {
  await requireAppPermission('requests.view')
  const [{ requestId }, context] = await Promise.all([
    params,
    getInvoiceContext(),
  ])
  if (!context)
    return (
      <AppError
        title="Activity could not be loaded"
        error={{ code: 'auth/forbidden', message: 'Forbidden.' }}
        variant="inline"
      />
    )

  const result = await getCrm().requestEvents.list(context.orgId, requestId)
  if (result.error)
    return (
      <AppError
        title="Activity could not be loaded"
        error={result.error}
        variant="inline"
      />
    )

  return <RequestEventsClient requestId={requestId} events={result.data.data} />
}
