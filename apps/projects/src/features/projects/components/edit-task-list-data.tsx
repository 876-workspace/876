import { AppError } from '@876/ui/app-error'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'

import { AttachmentsData } from '@/features/projects/components/attachments-data'
import { TaskListForm } from '@/features/projects/components/task-list-form'
import { loadMemberLabels } from '@/features/projects/member-labels'
import { projects } from '@/lib/services/projects'
import { listProjectMilestones } from '@/lib/work-structure-data'

export async function EditTaskListData({
  orgId,
  userId,
  taskListId,
  canEdit,
}: {
  orgId: string
  userId: string
  taskListId: string
  canEdit: boolean
}) {
  const [taskListResult, projectList, members] = await Promise.all([
    projects.taskLists.retrieve(orgId, taskListId),
    projects.projects.list(orgId, { limit: 100 }),
    loadMemberLabels(orgId),
  ])

  if (taskListResult.error?.code === 'projects/task-list-not-found') notFound()
  if (taskListResult.error || !taskListResult.data)
    return (
      <AppError
        title="The task list could not be loaded"
        error={
          taskListResult.error ?? {
            code: 'projects/task-list-unavailable',
            message: 'The task list could not be loaded.',
          }
        }
        variant="banner"
      />
    )

  const projectItems = projectList.data?.data ?? []
  const milestoneResults = await listProjectMilestones(orgId, projectItems)
  const loadError = [
    projectList.error,
    members.error,
    ...milestoneResults.map((result) => result.error),
  ].find(Boolean)

  return (
    <div className="space-y-4">
      {loadError ? (
        <AppError
          title="Some task list form data could not be loaded"
          error={loadError}
          variant="banner"
        />
      ) : null}
      <TaskListForm
        mode="edit"
        taskList={taskListResult.data}
        projects={projectItems}
        milestones={milestoneResults.flatMap(
          (result) => result.data?.data ?? []
        )}
        members={Object.entries(members.labels).map(([userId, label]) => ({
          userId,
          label,
        }))}
      />
      <Suspense
        fallback={
          <div className="text-muted-foreground text-sm">
            Loading attachments…
          </div>
        }
      >
        <AttachmentsData
          orgId={orgId}
          userId={userId}
          projectId={taskListResult.data.projectId}
          resourceType="task-list"
          resourceId={taskListResult.data.id}
          canEdit={canEdit}
        />
      </Suspense>
    </div>
  )
}
