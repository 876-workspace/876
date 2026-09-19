import type { ListIssuesQuery } from '@876/projects/contracts'
import {
  IssueBoard,
  type IssueBoardGroupBy,
} from '@876/projects-ui/issue-board'
import { AppError } from '@876/ui/app-error'

import { BoardDragBoard } from '@/features/projects/components/board-drag-board'
import { IssueFilterBar } from '@/features/projects/components/issue-filter-bar'

import { loadMemberLabels } from '@/features/projects/member-labels'
import { requireProjectsContext } from '@/lib/auth/require-projects-context'
import { projects } from '@/lib/clients/projects'
import type { IssueSearchParams } from '@/types/issues'

export async function BoardData({
  query,
  values,
  groupBy,
}: {
  query: ListIssuesQuery
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
      {groupBy === 'status' ? (
        <BoardDragBoard
          issues={result.data?.data ?? []}
          states={(states.data?.data ?? []).map((state) => ({
            key: state.key,
            label: state.name,
          }))}
          issuesHref="/issues"
          userLabels={members.labels}
        />
      ) : (
        <IssueBoard
          issues={result.data?.data ?? []}
          issuesHref="/issues"
          groupBy={groupBy}
          userLabels={members.labels}
        />
      )}
    </div>
  )
}
