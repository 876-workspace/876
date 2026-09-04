'use client'

import { ResourceToolbar } from '@876/ui/resource-toolbar'
import { StatusFilterHeading } from '@876/ui/status-filter-heading'

import {
  isIssueStatus,
  ISSUE_STATUS_OPTIONS,
  type IssueFilterStatus,
} from '@/features/projects/issue-status'

import { projectsBase } from '@/features/orgs/app-workspaces'

export function IssuesToolbar({ status }: { status: string }) {
  const selectedStatus: IssueFilterStatus = isIssueStatus(status)
    ? status
    : 'all'

  return (
    <ResourceToolbar
      title="Issues"
      titleFilter={
        <StatusFilterHeading
          label="Issues"
          value={selectedStatus}
          options={ISSUE_STATUS_OPTIONS}
        />
      }
      primaryLabel="Add"
      primaryHref={`${projectsBase(null)}/issues/new`}
      primaryVariant="info"
      refresh
    />
  )
}
