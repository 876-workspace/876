import type { IssueBoardGroupBy } from '@876/projects-ui/issue-board'
import { AppError } from '@876/ui/app-error'
import { ResourceToolbar } from '@876/ui/resource-toolbar'
import { Skeleton } from '@876/ui/skeleton'
import { StatusFilterHeading } from '@876/ui/status-filter-heading'
import type { Metadata } from 'next'
import { Suspense } from 'react'

import { BoardData } from '@/features/projects/components/board-data'
import { IssueFilterBar } from '@/features/projects/components/issue-filter-bar'
import { parseIssueFilters } from '@/features/projects/issue-filters'
import { loadMemberLabels } from '@/features/projects/member-labels'
import {
  buildIssueStatusOptions,
  loadWorkflowStateOptions,
  resolveIssueStatus,
} from '@/features/projects/workflow-state-options'
import { requireAppAccess, requireProjectsContext } from '@/lib/auth/require-projects-context'
import { projects } from '@/lib/clients/projects'
import type { IssueSearchParams } from '@/types/issues'

export const metadata: Metadata = { title: 'Board' }

type Props = { searchParams: Promise<IssueSearchParams> }

export default async function BoardPage({ searchParams }: Props) {
  await requireAppAccess({ module: 'issues', permission: 'issues.view' })
  const { orgId } = await requireProjectsContext()
  const filters = parseIssueFilters(await searchParams, 'status')
  const groupBy: IssueBoardGroupBy =
    filters.groupBy === 'none' ? 'status' : filters.groupBy
  const [stateOptions, projectList, labelList, memberResult] = await Promise.all([
    loadWorkflowStateOptions(orgId),
    projects.projects.list(orgId, { limit: 100 }),
    projects.labels.list(orgId),
    loadMemberLabels(orgId),
  ])
  const states = stateOptions.states
  const resolved = resolveIssueStatus(filters.values.status, states)
  const statusOptions = buildIssueStatusOptions(states)
  const query = { ...filters.query, status: resolved.queryStatus }
  const values = { ...filters.values, status: resolved.queryStatus }
  const chromeError =
    stateOptions.error ??
    projectList.error ??
    labelList.error ??
    memberResult.error
  const memberOptions = Object.entries(memberResult.labels).map(
    ([userId, label]) => ({
      userId,
      label,
    })
  )

  return (
    <div className="px-4 pt-5 pb-8 sm:px-6 lg:px-8">
      <ResourceToolbar
        title="Board"
        titleFilter={
          <StatusFilterHeading
            label="Board"
            value={resolved.headingValue}
            options={statusOptions}
          />
        }
        primaryLabel="Add"
        primaryHref="/issues/new"
        primaryVariant="info"
        refresh
      />
      <IssueFilterBar
        action="/board"
        values={values}
        groupBy={groupBy}
        projects={projectList.data?.data ?? []}
        labels={labelList.data?.data ?? []}
        members={memberOptions}
        allowUngrouped={false}
      />
      {chromeError ? (
        <AppError
          title="Some board data could not be loaded"
          error={chromeError}
          variant="banner"
        />
      ) : null}
      <Suspense
        fallback={
          <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
            {Array.from({ length: 6 }, (_, column) => (
              <Skeleton key={column} className="h-64 w-full" />
            ))}
          </div>
        }
      >
        <BoardData query={query} groupBy={groupBy} />
      </Suspense>
    </div>
  )
}
