'use client'

import { ResourceToolbar } from '@876/ui/resource-toolbar'
import { StatusFilterHeading } from '@876/ui/status-filter-heading'

import {
  isProjectStatus,
  PROJECT_STATUS_OPTIONS,
  type ProjectFilterStatus,
} from '@/features/projects/project-status'
import { workspaceBase } from '@/features/orgs/app-workspaces'

export function ProjectsToolbar({
  orgSlug,
  status,
}: {
  orgSlug: string
  status: string
}) {
  const selectedStatus: ProjectFilterStatus = isProjectStatus(status)
    ? status
    : 'all'

  return (
    <ResourceToolbar
      title="Projects"
      titleFilter={
        <StatusFilterHeading
          label="Projects"
          value={selectedStatus}
          options={PROJECT_STATUS_OPTIONS}
        />
      }
      primaryLabel="Add"
      primaryHref={`${workspaceBase(orgSlug, 'projects')}/projects/new`}
      primaryVariant="info"
      refresh
    />
  )
}
