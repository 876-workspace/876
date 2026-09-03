import { AppError } from '@876/ui/app-error'

import { PlatformOrganizationUnavailable } from '@/components/patterns/platform-organization-unavailable'
import { RequestTasksSection } from '@/features/crm/components/request-tasks'
import {
  loadDirectory,
  loadPriorities,
  loadRequest,
  loadTasks,
} from '@/features/crm/request-data'

export const metadata = { title: 'Tasks' }

type Props = { params: Promise<{ requestId: string }> }

export default async function RequestTasksPage({ params }: Props) {
  const { requestId } = await params
  const [requestResult, tasksResult, prioritiesResult, directory] =
    await Promise.all([
      loadRequest(requestId),
      loadTasks(requestId),
      loadPriorities(),
      loadDirectory(),
    ])

  if (!requestResult.org) return <PlatformOrganizationUnavailable />
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

  return (
    <div className="space-y-3">
      {tasksResult.error ? (
        <AppError
          title="Some task data could not be loaded"
          error={tasksResult.error}
          variant="banner"
          showCode
        />
      ) : null}
      {prioritiesResult.error ? (
        <AppError
          title="Priority details are temporarily incomplete"
          error={prioritiesResult.error}
          variant="inline"
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
      <RequestTasksSection
        organizationId={requestResult.org.id}
        requestId={requestResult.request.id}
        tasks={tasksResult.tasks}
        priorities={prioritiesResult.priorities}
        members={directory.members}
        currentUserId={requestResult.session.id}
      />
    </div>
  )
}
