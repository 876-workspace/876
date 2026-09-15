import { AppError } from '@876/ui/app-error'

import { loadMemberLabels } from '@/features/projects/member-labels'
import { requireProjectsContext } from '@/lib/auth/require-projects-context'
import { projects } from '@/lib/services/projects'
import {
  listProjectMilestones,
  listProjectTaskLists,
} from '@/lib/work-structure-data'

import { NewIssueForm } from './issue-form'

export async function NewIssueData() {
  const { orgId } = await requireProjectsContext()
  const [
    types,
    states,
    projectList,
    fields,
    labels,
    issueList,
    members,
    cycles,
  ] = await Promise.all([
    projects.workItemTypes.list(orgId),
    projects.workflowStates.list(orgId),
    projects.projects.list(orgId, { limit: 100 }),
    projects.customFields.list(orgId),
    projects.labels.list(orgId),
    projects.issues.list(orgId, { limit: 100, order: 'updated' }),
    loadMemberLabels(orgId),
    projects.cycles.list(orgId),
  ])
  const projectItems = projectList.data?.data ?? []
  const milestoneResults = await listProjectMilestones(orgId, projectItems)
  const taskListResults = await listProjectTaskLists(orgId, projectItems)
  const loadError = [
    types.error,
    states.error,
    projectList.error,
    fields.error,
    labels.error,
    issueList.error,
    members.error,
    cycles.error,
    ...milestoneResults.map((result) => result.error),
    ...taskListResults.map((result) => result.error),
  ].find(Boolean)

  return (
    <div className="space-y-4">
      {loadError ? (
        <AppError
          title="Some issue options could not be loaded"
          error={loadError}
          variant="banner"
        />
      ) : null}
      <NewIssueForm
        workItemTypes={types.data?.data ?? []}
        workflowStates={states.data?.data ?? []}
        projects={projectItems}
        milestones={milestoneResults.flatMap(
          (result) => result.data?.data ?? []
        )}
        taskLists={taskListResults.flatMap((result) => result.data?.data ?? [])}
        cycles={cycles.data?.data ?? []}
        customFields={fields.data?.data ?? []}
        labels={labels.data?.data ?? []}
        issues={issueList.data?.data ?? []}
        members={Object.entries(members.labels).map(([userId, label]) => ({
          userId,
          label,
        }))}
      />
    </div>
  )
}
