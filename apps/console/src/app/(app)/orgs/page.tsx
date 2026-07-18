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
import { ResourceToolbar } from '@/components/resource-toolbar'
import {
  StatusFilterHeading,
  type StatusFilterOption,
} from '@/components/status-filter-heading'
import { ORG_STATUSES, isOrgStatus } from '@/lib/org-status'
import { OrgSearchBar } from './org-search-bar'
import { OrgTable } from './org-table'
import { Page } from '@876/ui/page'
import Link from 'next/link'
import { buttonVariants } from '@876/ui/button'

export const metadata = { title: 'Organizations' }

const ORG_STATUS_OPTIONS: StatusFilterOption[] = [
  { value: 'all', label: 'All', headingLabel: 'All Organizations' },
  ...ORG_STATUSES.map((status) => ({
    value: status,
    label: status.charAt(0).toUpperCase() + status.slice(1),
    headingLabel: `${status.charAt(0).toUpperCase() + status.slice(1)} Organizations`,
  })),
]

type Props = {
  searchParams: Promise<{
    after?: string
    before?: string
    q?: string
    status?: string
  }>
}

export default async function OrganizationsPage({ searchParams }: Props) {
  const { after, before, q, status } = await searchParams

  const isSearching = Boolean(q?.trim())
  const selectedStatus =
    status === 'all' || !isOrgStatus(status) ? 'all' : status
  const orgStatus = selectedStatus === 'all' ? undefined : selectedStatus

  let orgs: AdminOrganization[] = []
  let hasMore = false

  if (isSearching) {
    const result = await $876.orgs.search({
      query: q!,
      limit: 50,
      status: orgStatus,
    })
    if (result.error) throw new Error(result.error.message)
    orgs = result.data.data
  } else {
    const result = await $876.orgs.list({
      limit: 25,
      starting_after: after,
      ending_before: before,
      status: orgStatus,
    })
    if (result.error) throw new Error(result.error.message)
    orgs = result.data.data
    hasMore = result.data.has_more
  }

  const orgIds = orgs.map((o) => o.id)
  const subscriptionsMap: Record<string, AdminSubscription[]> = {}
  if (orgIds.length > 0) {
    const accessResult = await $876.orgs.subscriptions.listByOrgs(orgIds)
    if (!accessResult.error) {
      for (const row of accessResult.data.data) {
        if (!subscriptionsMap[row.organization_id])
          subscriptionsMap[row.organization_id] = []
        subscriptionsMap[row.organization_id]!.push(row)
      }
    }
  }

  return (
    <Page>
      <TrackMCEventOnMount event={AnalyticsEvent.OrgListViewed} />
      <ResourceToolbar
        title="Organizations"
        titleFilter={
          <StatusFilterHeading
            label="Organizations"
            value={selectedStatus}
            options={ORG_STATUS_OPTIONS}
          />
        }
        primaryLabel="Add"
        primaryHref="/org/new"
        primaryVariant="info"
        refresh
        dropdownActions={[
          { label: 'Import', icon: 'import' },
          { label: 'Export', icon: 'export' },
          {
            label: 'Delete organizations',
            icon: 'delete',
            destructive: true,
            separator: true,
          },
        ]}
      />

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

      {orgs.length === 0 ? (
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
      )}
    </Page>
  )
}
