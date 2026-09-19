import type { ListIssuesQuery } from '@876/projects/contracts'
import { createIssueGroups } from '@876/projects-ui/issue-grouping'
import { IssuesTable } from '@876/projects-ui/issue-list'
import { AppError } from '@876/ui/app-error'

import { loadMemberLabels } from '@/features/projects/member-labels'
import { requireProjectsContext } from '@/lib/auth/require-projects-context'
import { projects } from '@/lib/clients/projects'
import type { IssueGroupBy } from '@/types/issues'

export async function IssuesData({
  query,
  groupBy,
}: {
  query: ListIssuesQuery
  groupBy: IssueGroupBy
}) {
  const { orgId } = await requireProjectsContext()
  const [result, members] = await Promise.all([
    projects.issues.list(orgId, query),
    loadMemberLabels(orgId),
  ])
  const rows = result.data?.data ?? []
  const loadError = result.error ?? members.error
  const groups =
    groupBy === 'none' ? [] : createIssueGroups(rows, groupBy, members.labels)

  return (
    <div className="space-y-4">
      {loadError ? (
        <AppError
          title="Some issue data could not be loaded"
          error={loadError}
          variant="banner"
        />
      ) : null}
      {groupBy === 'none' ? (
        <IssuesTable
          issues={rows}
          issuesHref="/issues"
          newIssueHref="/issues/new"
        />
      ) : groups.length === 0 ? (
        <IssuesTable
          issues={[]}
          issuesHref="/issues"
          newIssueHref="/issues/new"
        />
      ) : (
        <div className="space-y-6">
          {groups.map((group) => (
            <section key={group.key} className="space-y-2">
              <div className="flex items-center gap-2 px-1">
                <h2 className="text-sm font-semibold">{group.label}</h2>
                <span className="text-muted-foreground text-xs tabular-nums">
                  {group.issues.length}
                </span>
              </div>
              <IssuesTable issues={group.issues} issuesHref="/issues" />
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
