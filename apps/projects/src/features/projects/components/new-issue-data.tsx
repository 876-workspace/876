import { AppError } from '@876/ui/app-error'

import { requireProjectsContext } from '@/lib/auth/require-projects-context'
import { projects } from '@/lib/services/projects'
import { listProjectMilestones } from '@/lib/work-structure-data'

import { NewIssueForm } from './new-issue-form'

export async function NewIssueData() {
  const { orgId } = await requireProjectsContext()
  const [types, states, projectList, fields] = await Promise.all([
    projects.workItemTypes.list(orgId),
    projects.workflowStates.list(orgId),
    projects.projects.list(orgId, { limit: 100 }),
    projects.customFields.list(orgId),
  ])
  const projectItems = projectList.data?.data ?? []
  const milestoneResults = await listProjectMilestones(orgId, projectItems)
  const loadError = [
    types,
    states,
    projectList,
    fields,
    ...milestoneResults,
  ].find((result) => result.error)?.error

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
        customFields={fields.data?.data ?? []}
      />
    </div>
  )
}
