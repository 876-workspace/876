import { Suspense } from 'react'
import { DataTableSkeleton } from '@876/ui/data-table-skeleton'
import { Page } from '@876/ui/page'

import { PlatformOrganizationUnavailable } from '@/components/patterns/platform-organization-unavailable'
import { ProjectsData } from '@/features/projects/components/projects-data'
import { PROJECTS_SKELETON_COLUMNS } from '@/features/projects/components/projects-skeleton-columns'
import { isProjectStatus } from '@/features/projects/project-status'
import { projectsBase } from '@/features/orgs/app-workspaces'
import { getPlatformOrganization } from '@/lib/platform-org'

import { ProjectsSection } from '../_components/projects-section'

export const metadata = { title: 'Projects' }

export default async function PlatformProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const org = await getPlatformOrganization()
  const { status } = await searchParams
  if (!org) return <PlatformOrganizationUnavailable />

  return (
    <Page>
      <ProjectsSection>
        <Suspense
          fallback={
            <DataTableSkeleton columns={PROJECTS_SKELETON_COLUMNS} rows={5} />
          }
        >
          <ProjectsData
            organizationId={org.id}
            base={projectsBase(null)}
            status={isProjectStatus(status) ? status : undefined}
          />
        </Suspense>
      </ProjectsSection>
    </Page>
  )
}
