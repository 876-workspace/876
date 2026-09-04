import { Suspense, type ReactNode } from 'react'
import { DataTableSkeleton } from '@876/ui/data-table-skeleton'

import { PlatformOrganizationUnavailable } from '@/components/patterns/platform-organization-unavailable'
import { ProjectsData } from '@/features/projects/components/projects-data'
import { PROJECTS_SKELETON_COLUMNS } from '@/features/projects/components/projects-skeleton-columns'
import { getPlatformOrganization } from '@/lib/platform-org'

import { projectsBase } from '@/features/orgs/app-workspaces'

import { ProjectsSection } from './_components/projects-section'

export default async function PlatformProjectsLayout({
  children,
}: {
  children: ReactNode
}) {
  const org = await getPlatformOrganization()
  if (!org) return <PlatformOrganizationUnavailable />

  return (
    <ProjectsSection
      list={
        <Suspense
          fallback={
            <DataTableSkeleton columns={PROJECTS_SKELETON_COLUMNS} rows={5} />
          }
        >
          <ProjectsData organizationId={org.id} base={projectsBase(null)} />
        </Suspense>
      }
    >
      {children}
    </ProjectsSection>
  )
}
