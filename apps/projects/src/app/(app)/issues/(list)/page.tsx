import { ISSUES_SKELETON_COLUMNS } from '@876/projects-ui/skeleton-columns'
import { AppError } from '@876/ui/app-error'
import { DataTableSkeleton } from '@876/ui/data-table-skeleton'
import { ResourceToolbar } from '@876/ui/resource-toolbar'
import { StatusFilterHeading } from '@876/ui/status-filter-heading'
import type { Metadata } from 'next'
import { Suspense } from 'react'

import { IssueFilterBar } from '@/features/projects/components/issue-filter-bar'
import { IssuesData } from '@/features/projects/components/issues-data'
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

export const metadata: Metadata = { title: 'Issues' }

type Props = { searchParams: Promise<IssueSearchParams> }

export default async function IssuesPage({ searchParams }: Props) {
  await requireAppAccess({ module: 'issues', permission: 'issues.view' })
  const { orgId } = await requireProjectsContext()
  const filters = parseIssueFilters(await searchParams)
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
        title="Issues"
        titleFilter={
          <StatusFilterHeading
            label="Issues"
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
        action="/issues"
        values={values}
        groupBy={filters.groupBy}
        projects={projectList.data?.data ?? []}
        labels={labelList.data?.data ?? []}
        members={memberOptions}
      />
      {chromeError ? (
        <AppError
          title="Some issue data could not be loaded"
          error={chromeError}
          variant="banner"
        />
      ) : null}
      <Suspense
        fallback={
          <DataTableSkeleton columns={ISSUES_SKELETON_COLUMNS} rows={8} />
        }
      >
        <IssuesData query={query} groupBy={filters.groupBy} />
      </Suspense>
    </div>
  )
}
