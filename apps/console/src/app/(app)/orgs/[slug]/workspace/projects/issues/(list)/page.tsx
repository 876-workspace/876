import { DataTableSkeleton } from '@876/ui/data-table-skeleton'
import { ResourceToolbar } from '@876/ui/resource-toolbar'
import { StatusFilterHeading } from '@876/ui/status-filter-heading'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'

import { ISSUES_SKELETON_COLUMNS } from '@/features/projects/components/issues-skeleton-columns'
import { IssuesData } from '@/features/projects/components/issues-data'
import {
  isIssueStatus,
  ISSUE_STATUS_OPTIONS,
  type IssueFilterStatus,
} from '@/features/projects/issue-status'

import { resolveOrg } from '../../../../_data'
import { workspaceProjectsBase } from '../../_lib/base'

type Props = {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ status?: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const org = await resolveOrg(slug)
  if (!org) return { title: 'Issues' }

  return { title: `${org.name ?? org.slug} • Issues - Organizations` }
}

export default async function OrganizationIssuesPage({
  params,
  searchParams,
}: Props) {
  const { slug } = await params
  const org = await resolveOrg(slug)
  if (!org) notFound()

  const { status } = await searchParams
  const selectedStatus: IssueFilterStatus = isIssueStatus(status)
    ? status
    : 'all'

  return (
    <div>
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
        primaryHref={`/orgs/${slug}/workspace/projects/issues/new`}
        primaryVariant="info"
        refresh
      />
      <Suspense
        fallback={
          <DataTableSkeleton columns={ISSUES_SKELETON_COLUMNS} rows={5} />
        }
      >
        <IssuesData
          organizationId={org.id}
          base={workspaceProjectsBase(slug)}
          status={selectedStatus}
        />
      </Suspense>
    </div>
  )
}
