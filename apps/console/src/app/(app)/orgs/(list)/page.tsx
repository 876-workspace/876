import { workspace } from '@/lib/services/workspace'
import { platform } from '@/lib/services/platform'
import { Suspense } from 'react'
import type { AdminOrganization, AdminSubscription } from '@876/platform/compat'
import { DataTableSkeleton } from '@876/ui/data-table-skeleton'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@876/ui/empty'
import { Building2 } from '@876/ui/icons'
import { Page } from '@876/ui/page'

import { AnalyticsEvent } from '@/lib/analytics/events'
import { TrackMCEventOnMount } from '@/lib/analytics/track-event-on-mount'
import { isOrgStatus } from '@/lib/org-status'
import { OrgSearchBar } from '../_components/org-search-bar'
import { OrgTable } from '../_components/org-table'
import { ORGS_SKELETON_COLUMNS } from '../_components/orgs-skeleton-columns'
import { OrgsToolbar } from '../_components/orgs-toolbar'

export const metadata = { title: 'Organizations' }

type Props = {
  searchParams: Promise<{
    after?: string
    before?: string
    q?: string
    status?: string
  }>
}

export default async function OrganizationsPage({ searchParams }: Props) {
  const { status } = await searchParams
  const selectedStatus =
    status === 'all' || !isOrgStatus(status) ? 'all' : status

  return (
    <Page>
      <TrackMCEventOnMount event={AnalyticsEvent.OrgListViewed} />
      <OrgsToolbar status={selectedStatus} />
      <div className="mb-4 w-full max-w-sm">
        <Suspense>
          <OrgSearchBar />
        </Suspense>
      </div>
      <Suspense
        fallback={
          <DataTableSkeleton columns={ORGS_SKELETON_COLUMNS} rows={5} />
        }
      >
        <OrganizationsTableData searchParams={searchParams} />
      </Suspense>
    </Page>
  )
}

async function OrganizationsTableData({
  searchParams,
}: Pick<Props, 'searchParams'>) {
  const { after, before, q, status } = await searchParams

  const isSearching = Boolean(q?.trim())
  const selectedStatus =
    status === 'all' || !isOrgStatus(status) ? 'all' : status
  const orgStatus = selectedStatus === 'all' ? undefined : selectedStatus

  let orgs: AdminOrganization[] = []
  let hasMore = false

  if (isSearching) {
    const result = await platform.organizations.search({
      query: q!,
      limit: 50,
      status: orgStatus,
    })
    if (result.error) throw new Error(result.error.message)
    orgs = result.data.data
  } else {
    const result = await platform.organizations.list({
      limit: 25,
      startingAfter: after,
      endingBefore: before,
      status: orgStatus,
    })
    if (result.error) throw new Error(result.error.message)
    orgs = result.data.data
    hasMore = result.data.has_more
  }

  const orgIds = orgs.map((o) => o.id)
  const subscriptionsMap: Record<string, AdminSubscription[]> = {}
  if (orgIds.length > 0) {
    const batchResult = await workspace.apps.entitlements.list({
      organizationIds: orgIds,
    })
    if (batchResult.data?.data) {
      for (const row of batchResult.data.data) {
        if (!subscriptionsMap[row.organization_id])
          subscriptionsMap[row.organization_id] = []
        subscriptionsMap[row.organization_id]!.push(row)
      }
    }
  }

  return orgs.length === 0 ? (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Building2 />
        </EmptyMedia>
        <EmptyTitle>
          {isSearching ? 'No results' : 'No organizations'}
        </EmptyTitle>
        <EmptyDescription>
          {isSearching
            ? `No organizations matched "${q}".`
            : 'No organizations found.'}
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  ) : (
    <OrgTable
      data={orgs}
      subscriptionsMap={subscriptionsMap}
      isSearching={isSearching}
      hasMore={hasMore}
      firstId={orgs[0]?.id ?? null}
      lastId={orgs[orgs.length - 1]?.id ?? null}
    />
  )
}
