import { notFound } from 'next/navigation'
import { AppError } from '@876/ui/app-error'

import { RequestTasksSection } from '@/features/crm/components/request-tasks'
import {
  loadOrgDirectory,
  loadOrgPriorities,
  loadOrgRequest,
  loadOrgTasks,
} from '@/features/crm/request-data'
import { resolveOrgResult } from '@/features/orgs/org-data'
import { workspaceBase } from '@/features/orgs/app-workspaces'

export const metadata = { title: 'Tasks' }

type Props = { params: Promise<{ orgSlug: string; requestId: string }> }

export default async function OrgRequestTasksPage({ params }: Props) {
  const { orgSlug, requestId } = await params
  const orgResult = await resolveOrgResult(orgSlug)
  if (orgResult.error?.code === 'organization/not-found') notFound()
  if (orgResult.error)
    return (
      <AppError
        title="Organization details are temporarily unavailable"
        error={orgResult.error}
        variant="banner"
        showCode
      />
    )
  if (!orgResult.data) notFound()

  const [requestResult, tasksResult, prioritiesResult, directory] =
    await Promise.all([
      loadOrgRequest(
        orgResult.data.id,
        requestId,
        `${workspaceBase(orgSlug, 'crm')}/requests/${requestId}/tasks`
      ),
      loadOrgTasks(orgResult.data.id, requestId),
      loadOrgPriorities(orgResult.data.id),
      loadOrgDirectory(orgResult.data.id),
    ])

  if (!requestResult.request) {
    return requestResult.error ? (
      <AppError
        title="Request data is temporarily unavailable"
        error={requestResult.error}
        variant="banner"
        showCode
      />
    ) : null
  }

  const blockingError = tasksResult.error ?? prioritiesResult.error

  return (
    <div className="space-y-3">
      {blockingError ? (
        <AppError
          title="Task data is temporarily unavailable"
          error={blockingError}
          variant="banner"
          showCode
        />
      ) : null}
      {directory.membersError ? (
        <AppError
          title="Assignee details are temporarily incomplete"
          error={directory.membersError}
          variant="inline"
          showCode
        />
      ) : null}
      {blockingError ? null : (
        <RequestTasksSection
          organizationId={orgResult.data.id}
          requestId={requestResult.request.id}
          tasks={tasksResult.tasks}
          priorities={prioritiesResult.priorities}
          members={directory.members}
          currentUserId={requestResult.session.id}
        />
      )}
    </div>
  )
}
