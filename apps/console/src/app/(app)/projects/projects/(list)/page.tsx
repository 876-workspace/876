import { DataTableSkeleton } from '@876/ui/data-table-skeleton'
import { Page } from '@876/ui/page'
import { ResourceToolbar } from '@876/ui/resource-toolbar'
import { StatusFilterHeading } from '@876/ui/status-filter-heading'
import { Suspense } from 'react'

import { PlatformOrganizationUnavailable } from '@/components/patterns/platform-organization-unavailable'
import { ProjectsData } from '@/features/projects/components/projects-data'
import { PROJECTS_SKELETON_COLUMNS } from '@/features/projects/components/projects-skeleton-columns'
import {
  isProjectStatus,
  PROJECT_STATUS_OPTIONS,
  type ProjectFilterStatus,
} from '@/features/projects/project-status'
import { getPlatformOrganization } from '@/lib/platform-org'

import { PLATFORM_PROJECTS_BASE } from '../../_lib/base'

export const metadata = { title: 'Projects' }

type Props = { searchParams: Promise<{ status?: string }> }

export default async function PlatformProjectsPage({ searchParams }: Props) {
  const { status } = await searchParams
  const selectedStatus: ProjectFilterStatus = isProjectStatus(status)
    ? status
    : 'all'

  return (
    <Page>
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
      <Suspense
        fallback={
          <DataTableSkeleton columns={PROJECTS_SKELETON_COLUMNS} rows={5} />
        }
      >
        <ProjectsSection status={selectedStatus} />
      </Suspense>
    </Page>
  )
}

async function ProjectsSection({ status }: { status: ProjectFilterStatus }) {
  const org = await getPlatformOrganization()
  if (!org) return <PlatformOrganizationUnavailable />

  return (
    <ProjectsData
      organizationId={org.id}
      base={PLATFORM_PROJECTS_BASE}
      status={status}
    />
  )
}
