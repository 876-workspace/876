import { Suspense } from 'react'
import { DataTableSkeleton } from '@876/ui/data-table-skeleton'
import { Page } from '@876/ui/page'

import { PlatformOrganizationUnavailable } from '@/components/patterns/platform-organization-unavailable'
import { IssuesData } from '@/features/projects/components/issues-data'
import { ISSUES_SKELETON_COLUMNS } from '@/features/projects/components/issues-skeleton-columns'
import { isIssueStatus } from '@/features/projects/issue-status'
import { projectsBase } from '@/features/orgs/app-workspaces'
import { getPlatformOrganization } from '@/lib/platform-org'

import { IssuesSection } from '../_components/issues-section'

export const metadata = { title: 'Issues' }

export default async function PlatformIssuesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const org = await getPlatformOrganization()
  const { status } = await searchParams
  if (!org) return <PlatformOrganizationUnavailable />

  return (
    <Page>
      <IssuesSection>
        <Suspense
          fallback={
            <DataTableSkeleton columns={ISSUES_SKELETON_COLUMNS} rows={5} />
          }
        >
          <IssuesData
            organizationId={org.id}
            base={projectsBase(null)}
            status={isIssueStatus(status) ? status : undefined}
          />
        </Suspense>
      </IssuesSection>
    </Page>
  )
}
