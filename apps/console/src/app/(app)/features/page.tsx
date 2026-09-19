import { platform } from '@/lib/clients/platform'
import { workspace } from '@/lib/clients/workspace'
import { Suspense } from 'react'
import type { AdminApp } from '@876/platform/compat'
import { Flag } from '@876/ui/icons'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@876/ui/empty'
import {
  DataTableSkeleton,
  type DataTableSkeletonColumn,
} from '@876/ui/data-table-skeleton'
import { Page } from '@876/ui/page'
import { ResourceToolbar } from '@876/ui/resource-toolbar'
import { StatusFilterHeading } from '@876/ui/status-filter-heading'

import { FeaturesTable } from './_components/features-table'

export const metadata = {
  title: 'Features',
  description: 'Manage PostHog-backed feature flags.',
}

const APP_KINDS = ['internal', 'platform', 'product'] as const

const FEATURES_SKELETON_COLUMNS = [
  { label: 'Name' },
  { label: 'Slug' },
  { label: 'App' },
  { label: 'Scope' },
  { label: 'Enabled' },
  { label: 'Updated' },
] satisfies DataTableSkeletonColumn[]

type Props = {
  searchParams: Promise<{
    after?: string
    before?: string
  }>
}

export default function FeaturesPage({ searchParams }: Props) {
  return (
    <Page>
      <ResourceToolbar
        title="Features"
        titleFilter={
          <StatusFilterHeading
            label="Features"
            value="all"
            options={[{ value: 'all', label: 'All Features' }]}
          />
        }
        description="Manage PostHog-backed feature flags."
        primaryLabel="Add"
        primaryHref="/features/new"
        primaryVariant="info"
        refresh
      />

      <Suspense
        fallback={
          <DataTableSkeleton columns={FEATURES_SKELETON_COLUMNS} rows={5} />
        }
      >
        <FeaturesTableData searchParams={searchParams} />
      </Suspense>
    </Page>
  )
}

async function FeaturesTableData({ searchParams }: Props) {
  const { after, before } = await searchParams
  const [featuresResult, ...appResults] = await Promise.all([
    workspace.features.list({
      limit: 25,
      startingAfter: after,
      endingBefore: before,
      rootOnly: true,
      excludeTag: 'widget',
    }),
    ...APP_KINDS.map((appKind) =>
      platform.apps.list({
        limit: 100,
        appKind,
        clientType: 'public',
      })
    ),
  ])
  const features = featuresResult.data?.data ?? []
  const apps: AdminApp[] = appResults
    .flatMap((result) => result.data?.data ?? [])
    .sort((a, b) => a.name.localeCompare(b.name))

  return (
    <FeaturesTable
      apps={apps}
      data={features}
      hasMore={featuresResult.data?.has_more ?? false}
      firstId={features[0]?.id ?? null}
      lastId={features[features.length - 1]?.id ?? null}
      emptyState={
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Flag className="text-amber-600 dark:text-amber-400" />
            </EmptyMedia>
            <EmptyTitle>No features</EmptyTitle>
            <EmptyDescription>
              Create a feature flag for the platform or a specific app.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      }
    />
  )
}
