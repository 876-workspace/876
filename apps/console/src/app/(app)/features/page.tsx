import type { AdminApp } from '@876/admin'
import { Flag } from '@876/ui/icons'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@876/ui/empty'
import { Page } from '@876/ui/page'

import { $876 } from '@/lib/876'
import { ResourceToolbar } from '@/components/resource-toolbar'
import { FeaturesTable } from './features-table'

export const metadata = {
  title: 'Features',
  description: 'Manage PostHog-backed feature flags.',
}

const APP_KINDS = ['internal', 'platform', 'product'] as const

type Props = {
  searchParams: Promise<{
    after?: string
    before?: string
  }>
}

export default async function FeaturesPage({ searchParams }: Props) {
  const { after, before } = await searchParams
  const [featuresResult, ...appResults] = await Promise.all([
    $876.features.list({
      limit: 25,
      starting_after: after,
      ending_before: before,
      rootOnly: true,
      excludeTag: 'widget',
    }),
    ...APP_KINDS.map((appKind) =>
      $876.apps.list({
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
    <Page>
      <ResourceToolbar
        title="Features"
        description="Manage PostHog-backed feature flags."
        primaryLabel="New Feature"
        primaryHref="/features/new"
        primaryVariant="info"
        refresh
      />

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
    </Page>
  )
}
