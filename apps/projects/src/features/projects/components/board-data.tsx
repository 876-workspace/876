import type { ListIssuesQuery } from '@876/projects/contracts'
import {
  IssueBoard,
  type IssueBoardGroupBy,
} from '@876/projects-ui/issue-board'
import { AppError } from '@876/ui/app-error'

import { BoardDragBoard } from '@/features/projects/components/board-drag-board'
import { loadMemberLabels } from '@/features/projects/member-labels'
import { loadWorkflowStateOptions } from '@/features/projects/workflow-state-options'
import { requireProjectsContext } from '@/lib/auth/require-projects-context'
import { projects } from '@/lib/clients/projects'

export async function BoardData({
  query,
  groupBy,
}: {
  query: ListIssuesQuery
  groupBy: IssueBoardGroupBy
}) {
  const { orgId } = await requireProjectsContext()
  const [result, states, members] = await Promise.all([
    projects.issues.list(orgId, query),
    loadWorkflowStateOptions(orgId),
    loadMemberLabels(orgId),
  ])
  const loadError = result.error ?? states.error ?? members.error

  return (
    <div className="space-y-4">
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
          states={states.states.map((state) => ({
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
