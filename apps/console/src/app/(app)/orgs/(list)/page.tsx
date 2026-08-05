import { Suspense } from 'react'
import type { AdminOrganization, AdminSubscription } from '@876/admin'
import { Building2 } from '@876/ui/icons'

import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from '@876/ui/empty'

import { $876 } from '@/lib/876'
import { AnalyticsEvent } from '@/lib/analytics/events'
import { TrackMCEventOnMount } from '@/lib/analytics/track-event-on-mount'
import { isOrgStatus } from '@/lib/org-status'
import { OrgSearchBar } from '../_components/org-search-bar'
import { OrgTable } from '../_components/org-table'
import { Page } from '@876/ui/page'
import { DataTableSkeleton } from '@876/ui/data-table-skeleton'
import Link from 'next/link'
import { buttonVariants } from '@876/ui/button'
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
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="w-full max-w-sm">
          <Suspense>
            <OrgSearchBar />
          </Suspense>
        </div>
        <Link
          href="/orgs/provisioning"
          className={buttonVariants({ variant: 'outline' })}
        >
          Provisioning defaults
        </Link>
      </div>
      <Suspense
        fallback={<DataTableSkeleton columns={ORGS_SKELETON_COLUMNS} />}
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
    const result = await $876.organizations.search({
      query: q!,
      limit: 50,
      status: orgStatus,
    })
    if (result.error) throw new Error(result.error.message)
    orgs = result.data.data
  } else {
    const result = await $876.organizations.list({
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
    const accessResult = await $876.subscriptions.listByOrganizations(orgIds)
    if (!accessResult.error) {
      for (const row of accessResult.data.data) {
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
