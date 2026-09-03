import { AppError } from '@876/ui/app-error'
import { CheckCircleIcon, ClipboardList, Folder } from '@876/ui/icons'
import Link from 'next/link'

import { StatTile } from '@/components/patterns/detail/stat-tile'
import { projects } from '@/lib/services/projects'
import { IssuesTable } from '@876/projects-ui/issue-list'

const OPEN_ISSUE_STATUSES = new Set([
  'backlog',
  'todo',
  'in-progress',
  'in-review',
])
const RECENT_LIMIT = 5

export async function OverviewData({
  organizationId,
  base,
}: {
  organizationId: string
  base: string
}) {
  const [projectsResult, issuesResult] = await Promise.all([
    projects.projects.list(organizationId),
    projects.issues.list(organizationId),
  ])
  const projectList = projectsResult.data?.data ?? []
  const issueList = issuesResult.data?.data ?? []

  const activeProjectsCount = projectList.filter(
    (project) => project.status === 'active'
  ).length

  const openIssuesCount = issueList.filter((issue) =>
    OPEN_ISSUE_STATUSES.has(issue.status)
  ).length

  const recentIssues = issueList
    .toSorted((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, RECENT_LIMIT)

  return (
    <div className="space-y-5">
      {projectsResult.error ? (
        <AppError
          title="Project data is temporarily unavailable"
          error={projectsResult.error}
          variant="banner"
          showCode
        />
      ) : null}
      {issuesResult.error ? (
        <AppError
          title="Issue data is temporarily unavailable"
          error={issuesResult.error}
          variant="banner"
          showCode
        />
      ) : null}

      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile
          icon={Folder}
          label="Active projects"
          value={projectsResult.error ? '—' : activeProjectsCount}
        />
        <StatTile
          icon={ClipboardList}
          label="Open issues"
          value={issuesResult.error ? '—' : openIssuesCount}
        />
        <StatTile
          icon={CheckCircleIcon}
          label="Total issues"
          value={
            issuesResult.error
              ? '—'
              : (issuesResult.data?.total_count ?? issueList.length)
          }
        />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-[0.9375rem] font-semibold">
            Recently updated issues
          </h2>
          <Link
            href={`${base}/issues`}
            className="text-876-accent-fg text-[0.8125rem] font-medium hover:underline"
          >
            View all
          </Link>
        </div>
        {issuesResult.error ? null : (
          <IssuesTable
            issues={recentIssues}
            issuesHref={`${base}/issues`}
            newIssueHref={`${base}/issues/new`}
          />
        )}
      </div>
    </div>
  )
}
