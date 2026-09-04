import { Suspense, type ReactNode } from 'react'
import { DataTableSkeleton } from '@876/ui/data-table-skeleton'

import { PlatformOrganizationUnavailable } from '@/components/patterns/platform-organization-unavailable'
import { IssuesData } from '@/features/projects/components/issues-data'
import { ISSUES_SKELETON_COLUMNS } from '@/features/projects/components/issues-skeleton-columns'
import { getPlatformOrganization } from '@/lib/platform-org'

import { projectsBase } from '@/features/orgs/app-workspaces'

import { IssuesSection } from './_components/issues-section'

export default async function PlatformIssuesLayout({
  children,
}: {
  children: ReactNode
}) {
  const org = await getPlatformOrganization()
  if (!org) return <PlatformOrganizationUnavailable />

  return (
    <IssuesSection
      list={
        <Suspense
          fallback={
            <DataTableSkeleton columns={ISSUES_SKELETON_COLUMNS} rows={5} />
          }
        >
          <IssuesData organizationId={org.id} base={projectsBase(null)} />
        </Suspense>
      }
    >
      {children}
    </IssuesSection>
  )
}
