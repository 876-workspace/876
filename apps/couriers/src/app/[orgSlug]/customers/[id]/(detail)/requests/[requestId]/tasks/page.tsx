import { Suspense } from 'react'

import { getError, toAppError } from '@876/core'
import { AppError } from '@876/ui/app-error'
import { Skeleton } from '@876/ui/skeleton'

import { CustomerRequestTasksClient } from '../../_components/request-tasks-client'
import { getManageContext } from '@/lib/auth/manage-context'
import { crm } from '@/lib/services/crm'

export const metadata = { title: 'Request tasks' }

export default function CustomerRequestTasksPage({
  params,
}: {
  params: Promise<{ orgSlug: string; id: string; requestId: string }>
}) {
  return (
    <Suspense fallback={<Skeleton className="h-56 w-full" />}>
      <TasksData params={params} />
    </Suspense>
  )
}

async function TasksData({
  params,
}: {
  params: Promise<{ orgSlug: string; id: string; requestId: string }>
}) {
  const { orgSlug, requestId } = await params
  const context = await getManageContext(orgSlug)
  if (!context)
    return (
      <AppError
        title="Tasks could not be loaded"
        error={toAppError(getError('auth/forbidden'))}
        variant="inline"
      />
    )

  const result = await crm.requestTasks.list(context.orgId, requestId)
  if (result.error)
    return (
      <AppError
        title="Tasks could not be loaded"
        error={toAppError(getError(result.error.code))}
        variant="inline"
      />
    )

  return (
    <CustomerRequestTasksClient
      orgSlug={orgSlug}
      requestId={requestId}
      tasks={result.data.data}
    />
  )
}
