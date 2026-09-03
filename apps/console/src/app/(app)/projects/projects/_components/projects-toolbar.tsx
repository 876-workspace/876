'use client'

import { ResourceToolbar } from '@876/ui/resource-toolbar'
import { StatusFilterHeading } from '@876/ui/status-filter-heading'

import {
  isProjectStatus,
  PROJECT_STATUS_OPTIONS,
  type ProjectFilterStatus,
} from '@/features/projects/project-status'

import { PLATFORM_PROJECTS_BASE } from '../../_lib/paths'

export function ProjectsToolbar({ status }: { status: string }) {
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
      primaryHref={`${PLATFORM_PROJECTS_BASE}/projects/new`}
      primaryVariant="info"
      refresh
    />
  )
}
