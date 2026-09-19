import { AppError } from '@876/ui/app-error'

import { TaskListForm } from '@/features/projects/components/task-list-form'
import { loadMemberLabels } from '@/features/projects/member-labels'
import { requireProjectsContext } from '@/lib/auth/require-projects-context'
import { projects } from '@/lib/clients/projects'
import { listProjectMilestones } from '@/lib/work-structure-data'

export async function NewTaskListData({ projectId }: { projectId?: string }) {
  const { orgId } = await requireProjectsContext()
  const [projectList, members] = await Promise.all([
    projects.projects.list(orgId, { limit: 100 }),
    loadMemberLabels(orgId),
  ])
  const projectItems = projectList.data?.data ?? []
  const milestoneResults = await listProjectMilestones(orgId, projectItems)
  const loadError = [
    projectList.error,
    members.error,
    ...milestoneResults.map((result) => result.error),
  ].find(Boolean)

  const requested = projectId
    ? projectItems.find((project) => project.id === projectId)
    : undefined

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
        mode="create"
        projects={projectItems}
        milestones={milestoneResults.flatMap(
          (result) => result.data?.data ?? []
        )}
        members={Object.entries(members.labels).map(([userId, label]) => ({
          userId,
          label,
        }))}
        defaultProjectId={requested?.id}
      />
    </div>
  )
}
