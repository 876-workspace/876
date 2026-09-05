import type { Metadata } from 'next'
import { Suspense } from 'react'
import { DataTableSkeleton } from '@876/ui/data-table-skeleton'
import { notFound } from 'next/navigation'

import { projectsBase } from '@/features/orgs/app-workspaces'
import { IssuesData } from '@/features/projects/components/issues-data'
import { ISSUES_SKELETON_COLUMNS } from '@/features/projects/components/issues-skeleton-columns'
import { isIssueStatus } from '@/features/projects/issue-status'
import { resolveOrg } from '@/features/orgs/org-data'

import { IssuesSection } from '../_components/issues-section'

type Props = {
  params: Promise<{ orgSlug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { orgSlug } = await params
  const org = await resolveOrg(orgSlug)
  if (!org) return { title: 'Issues' }

  return { title: `${org.name ?? org.slug} • Issues - Organizations` }
}

export default async function OrganizationIssuesPage({
  params,
  searchParams,
}: Props & { searchParams: Promise<{ status?: string }> }) {
  const { orgSlug } = await params
  const { status } = await searchParams
  const org = await resolveOrg(orgSlug)
  if (!org) notFound()

  return (
    <IssuesSection orgSlug={orgSlug}>
      <Suspense
        fallback={
          <DataTableSkeleton columns={ISSUES_SKELETON_COLUMNS} rows={5} />
        }
      >
        <IssuesData
          organizationId={org.id}
          base={projectsBase(orgSlug)}
          status={isIssueStatus(status) ? status : undefined}
        />
      </Suspense>
    </IssuesSection>
  )
}
