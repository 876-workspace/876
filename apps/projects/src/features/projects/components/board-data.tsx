import {
  IssueBoard,
  type IssueBoardGroupBy,
} from '@876/projects-ui/issue-board'
import { AppError } from '@876/ui/app-error'

import { IssueFilterBar } from '@/features/projects/components/issue-filter-bar'
import type { IssueSearchParams } from '@/features/projects/issue-filters'
import { loadMemberLabels } from '@/features/projects/member-labels'
import { requireProjectsContext } from '@/lib/auth/require-projects-context'
import { projects } from '@/lib/services/projects'

export async function BoardData({
  query,
  values,
  groupBy,
}: {
  query: Parameters<typeof projects.issues.list>[1]
  values: IssueSearchParams
  groupBy: IssueBoardGroupBy
}) {
  const { orgId } = await requireProjectsContext()
  const [result, projectList, states, labels, members] = await Promise.all([
    projects.issues.list(orgId, query),
    projects.projects.list(orgId, { limit: 100 }),
    projects.workflowStates.list(orgId),
    projects.labels.list(orgId),
    loadMemberLabels(orgId),
  ])
  const loadError =
    result.error ??
    projectList.error ??
    states.error ??
    labels.error ??
    members.error

  return (
    <div className="space-y-4">
      <IssueFilterBar
        action="/board"
        values={values}
        groupBy={groupBy}
        projects={projectList.data?.data ?? []}
        workflowStates={states.data?.data ?? []}
        labels={labels.data?.data ?? []}
        members={Object.entries(members.labels).map(([userId, label]) => ({
          userId,
          label,
        }))}
        allowUngrouped={false}
      />
      {loadError ? (
        <AppError
          title="Some board data could not be loaded"
          error={loadError}
          variant="banner"
        />
      ) : null}
      <IssueBoard
        issues={result.data?.data ?? []}
        issuesHref="/issues"
        groupBy={groupBy}
        userLabels={members.labels}
      />
    </div>
  )
}
