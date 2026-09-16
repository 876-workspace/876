import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { DataTableSkeleton } from '@876/ui/data-table-skeleton'
import { ResourceToolbar } from '@876/ui/resource-toolbar'
import { StatusFilterHeading } from '@876/ui/status-filter-heading'

import { projectsBase } from '@/features/orgs/app-workspaces'
import { resolveOrg } from '@/features/orgs/org-data'
import { TimesheetsData } from '@/features/projects/components/timesheets-data'
import { TIMESHEETS_SKELETON_COLUMNS } from '@/features/projects/components/operator-skeleton-columns'
import {
  isApprovalStatus,
  TIMESHEET_STATUS_OPTIONS,
} from '@/features/projects/time-status'

type Props = {
  params: Promise<{ orgSlug: string }>
  searchParams: Promise<{ status?: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { orgSlug } = await params
  const org = await resolveOrg(orgSlug)
  if (!org) return { title: 'Timesheets' }

  return { title: `${org.name ?? org.slug} • Timesheets - Organizations` }
}

export default async function OrganizationTimesheetsPage({
  params,
  searchParams,
}: Props) {
  const { orgSlug } = await params
  const { status } = await searchParams
  const org = await resolveOrg(orgSlug)
  if (!org) notFound()

  return (
    <div>
      <ResourceToolbar
        title="Timesheets"
        titleFilter={
          <StatusFilterHeading
            label="Timesheets"
            value={isApprovalStatus(status) ? status : 'all'}
            options={TIMESHEET_STATUS_OPTIONS}
          />
        }
        refresh
      />
      <Suspense
        fallback={
          <DataTableSkeleton columns={TIMESHEETS_SKELETON_COLUMNS} rows={5} />
        }
      >
        <TimesheetsData
          organizationId={org.id}
          base={projectsBase(orgSlug)}
          status={isApprovalStatus(status) ? status : undefined}
        />
      </Suspense>
    </div>
  )
}
