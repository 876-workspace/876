import { Suspense } from 'react'

import { AppError } from '@876/ui/app-error'
import { Skeleton } from '@876/ui/skeleton'

import { RequestTasksClient } from '@/features/crm/request-tasks-client'
import { getWorkspaceContext } from '@/lib/auth/billing-context'
import { getCrm } from '@/lib/services/crm'

export const metadata = { title: 'Request tasks' }

export default function RequestTasksPage({
  params,
}: {
  params: Promise<{ requestId: string }>
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
  params: Promise<{ requestId: string }>
}) {
  const [{ requestId }, context] = await Promise.all([
    params,
    getWorkspaceContext(),
  ])
  if (!context)
    return (
      <AppError
        title="Tasks could not be loaded"
        error={{ code: 'auth/forbidden', message: 'Forbidden.' }}
        variant="inline"
      />
    )

  const result = await getCrm().requestTasks.list(context.orgId, requestId)
  if (result.error)
    return (
      <AppError
        title="Tasks could not be loaded"
        error={result.error}
        variant="inline"
      />
    )

  return <RequestTasksClient requestId={requestId} tasks={result.data.data} />
}
