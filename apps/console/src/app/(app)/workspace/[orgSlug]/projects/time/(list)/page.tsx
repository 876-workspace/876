import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { DataTableSkeleton } from '@876/ui/data-table-skeleton'
import { ResourceToolbar } from '@876/ui/resource-toolbar'
import { StatusFilterHeading } from '@876/ui/status-filter-heading'

import { projectsBase } from '@/features/orgs/app-workspaces'
import { resolveOrg } from '@/features/orgs/org-data'
import { TimeEntriesData } from '@/features/projects/components/time-entries-data'
import { OPERATOR_TIME_ENTRY_SKELETON_COLUMNS } from '@/features/projects/components/operator-skeleton-columns'
import {
  isApprovalStatus,
  TIME_ENTRY_STATUS_OPTIONS,
} from '@/features/projects/time-status'

type Props = {
  params: Promise<{ orgSlug: string }>
  searchParams: Promise<{
    project?: string
    status?: string
    billable?: string
  }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { orgSlug } = await params
  const org = await resolveOrg(orgSlug)
  if (!org) return { title: 'Time' }

  return { title: `${org.name ?? org.slug} • Time - Organizations` }
}

export default async function OrganizationTimePage({
  params,
  searchParams,
}: Props) {
  const { orgSlug } = await params
  const query = await searchParams
  const org = await resolveOrg(orgSlug)
  if (!org) notFound()

  return (
    <div>
      <ResourceToolbar
        title="Time"
        titleFilter={
          <StatusFilterHeading
            label="Time"
            value={isApprovalStatus(query.status) ? query.status : 'all'}
            options={TIME_ENTRY_STATUS_OPTIONS}
          />
        }
        refresh
      />
      <Suspense
        fallback={
          <DataTableSkeleton
            columns={OPERATOR_TIME_ENTRY_SKELETON_COLUMNS}
            rows={5}
          />
        }
      >
        <TimeEntriesData
          organizationId={org.id}
          base={projectsBase(orgSlug)}
          projectId={query.project?.trim() || undefined}
          approvalStatus={
            isApprovalStatus(query.status) ? query.status : undefined
          }
          billable={
            query.billable === 'true'
              ? true
              : query.billable === 'false'
                ? false
                : undefined
          }
        />
      </Suspense>
    </div>
  )
}
