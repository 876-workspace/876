import { Suspense } from 'react'
import type { AdminApp, AdminAppStatus, AdminOrganization } from '@876/admin'
import { LayoutDashboard } from '@876/ui/icons'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@876/ui/empty'

import { $876 } from '@/lib/876'
import { ResourceToolbar } from '@/components/resource-toolbar'
import {
  StatusFilterHeading,
  type StatusFilterOption,
} from '@/components/status-filter-heading'
import { APP_STATUSES } from '@/lib/app-status'
import { AppsTable } from './apps-table'
import { Page } from '@876/ui/page'
import { AppsSearchBar } from './apps-search-bar'

type AppStatusFilterValue = 'all' | AdminAppStatus

const APP_STATUS_OPTIONS: StatusFilterOption[] = [
  { value: 'all', label: 'All', headingLabel: 'All Apps' },
  ...APP_STATUSES.map((status) => ({
    value: status,
    label: status.charAt(0).toUpperCase() + status.slice(1),
    headingLabel: `${status.charAt(0).toUpperCase() + status.slice(1)} Apps`,
  })),
]

export const metadata = {
  title: 'Apps',
  description: 'Manage registered platform applications.',
}

export const dynamic = 'force-dynamic'
export const revalidate = 0

type Props = {
  searchParams: Promise<{
    after?: string
    before?: string
    q?: string
    status?: string
  }>
}

function resolveStatusFilter(status?: string): AppStatusFilterValue {
  if (status === 'all' || status === 'inactive') return status
  return 'active'
}

export default async function AppsPage({ searchParams }: Props) {
  const { q, status } = await searchParams
  const query = q?.trim().toLowerCase() ?? ''
  const isSearching = query.length > 0
  const selectedStatus = resolveStatusFilter(status)
  const appStatus: AdminAppStatus | undefined =
    selectedStatus === 'all' ? undefined : selectedStatus

  // First-party apps span three kinds (internal / platform / product); the API
  // filters one kind per call, so fetch all three and merge. External
  // (third-party OAuth) apps are managed elsewhere and excluded here. The set is
  // small, so we render every first-party app in one pass — the table's Kind
  // column supplies the categorization — and skip cursor pagination.
  const FIRST_PARTY_KINDS = ['internal', 'platform', 'product'] as const
  const kindOrder: Record<string, number> = {
    internal: 0,
    platform: 1,
    product: 2,
  }
  const results = await Promise.all(
    FIRST_PARTY_KINDS.map((kind) =>
      $876.apps.list({
        limit: 100,
        appKind: kind,
        clientType: 'public',
        status: appStatus,
      })
    )
  )
  const allApps: AdminApp[] = results
    .flatMap((r) => r.data?.data ?? [])
    .sort(
      (a, b) =>
        (kindOrder[a.app_kind] ?? 9) - (kindOrder[b.app_kind] ?? 9) ||
        a.name.localeCompare(b.name)
    )
  const apps = isSearching
    ? allApps.filter(
        (app) =>
          app.name.toLowerCase().includes(query) ||
          app.slug.toLowerCase().includes(query)
      )
    : allApps

  const orgIds = [
    ...new Set(apps.map((a) => a.organization_id).filter(Boolean) as string[]),
  ]
  const orgMap = new Map<string, AdminOrganization>()
  await Promise.all(
    orgIds.map(async (id) => {
      const { data: org } = await $876.orgs.retrieve(id)
      if (org) orgMap.set(id, org)
    })
  )

  return (
    <Page>
      <ResourceToolbar
        title="Apps"
        titleFilter={
          <StatusFilterHeading
            label="Apps"
            value={selectedStatus}
            options={APP_STATUS_OPTIONS}
          />
        }
        primaryLabel="New App"
        primaryHref="/apps/new"
        primaryVariant="info"
        refresh
      />

      <div className="mb-4 max-w-sm">
        <Suspense>
          <AppsSearchBar />
        </Suspense>
      </div>

      {apps.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <LayoutDashboard className="text-blue-600 dark:text-blue-400" />
            </EmptyMedia>
            <EmptyTitle>{isSearching ? 'No results' : 'No apps'}</EmptyTitle>
            <EmptyDescription>
              {isSearching
                ? `No applications matched "${q}".`
                : `No ${
                    selectedStatus === 'all' ? 'registered' : selectedStatus
                  } applications found.`}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <AppsTable
          data={apps}
          orgMap={Object.fromEntries(orgMap)}
          hasMore={false}
          firstId={null}
          lastId={null}
        />
      )}
    </Page>
  )
}
