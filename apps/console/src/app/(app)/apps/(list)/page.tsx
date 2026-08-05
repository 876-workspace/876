import { Suspense } from 'react'
import type { AdminApp, AdminAppStatus } from '@876/admin'
import { LayoutDashboard } from '@876/ui/icons'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@876/ui/empty'

import { $876 } from '@/lib/876'
import { AppsTable } from '../_components/apps-table'
import { Page } from '@876/ui/page'
import { AppsSearchBar } from '../_components/apps-search-bar'
import { DataTableSkeleton } from '@876/ui/data-table-skeleton'
import { APPS_SKELETON_COLUMNS } from '../_components/apps-skeleton-columns'
import { AppsToolbar } from '../_components/apps-toolbar'
import { resolveStatusFilter } from '../_lib/app-status-filter'

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

export default async function AppsPage({ searchParams }: Props) {
  const { status } = await searchParams
  const selectedStatus = resolveStatusFilter(status)

  return (
    <Page>
      <AppsToolbar status={selectedStatus} />
      <div className="mb-4 max-w-sm">
        <Suspense>
          <AppsSearchBar />
        </Suspense>
      </div>
      <Suspense
        fallback={<DataTableSkeleton columns={APPS_SKELETON_COLUMNS} />}
      >
        <AppsTableData searchParams={searchParams} />
      </Suspense>
    </Page>
  )
}

async function AppsTableData({ searchParams }: Pick<Props, 'searchParams'>) {
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

  return apps.length === 0 ? (
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
    <AppsTable data={apps} hasMore={false} firstId={null} lastId={null} />
  )
}
