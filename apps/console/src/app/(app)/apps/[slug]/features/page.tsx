import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { buttonVariants } from '@876/ui/button'
import { Flag } from '@876/ui/icons'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@876/ui/empty'

import { $876 } from '@/lib/876'
import { PINNED_ROOT_FEATURE_SLUGS } from '@/lib/feature-groups'
import { resolveApp } from '../_data'
import { AppFeaturesTable } from './features-table'

type Props = {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ after?: string; before?: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const app = await resolveApp(slug)
  if (!app) return { title: 'Features' }
  return { title: `${app.name} • Features - Apps` }
}

export default async function AppFeaturesPage({ params, searchParams }: Props) {
  const { slug } = await params
  const { after, before } = await searchParams

  const app = await resolveApp(slug)
  if (!app) notFound()

  const [featureListResult, groupFeatureResult] = await Promise.all([
    $876.apps.features.list(app.id, {
      limit: 25,
      starting_after: after,
      ending_before: before,
      rootOnly: true,
      excludeTag: 'widget',
    }),
    $876.apps.features.list(app.id, {
      limit: 100,
      excludeTag: 'widget',
    }),
  ])

  const featureById = new Map(
    (featureListResult.data?.data ?? []).map((feature) => [feature.id, feature])
  )
  const firstId = featureListResult.data?.data[0]?.id ?? null
  const lastId = featureListResult.data?.data.at(-1)?.id ?? null
  for (const rootSlug of PINNED_ROOT_FEATURE_SLUGS) {
    const rootFeature = groupFeatureResult.data?.data.find(
      (feature) => feature.slug === rootSlug
    )
    if (rootFeature) featureById.set(rootFeature.id, rootFeature)
  }
  const features = Array.from(featureById.values())
  const hasMore = featureListResult.data?.has_more ?? false

  return (
    <div className="space-y-5">
      <div className="mb-2">
        <h2 className="text-lg font-medium tracking-tight">Feature Flags</h2>
      </div>

      <AppFeaturesTable
        appSlug={slug}
        data={features}
        hasMore={hasMore}
        firstId={firstId}
        lastId={lastId}
        toolbarAction={
          <Link
            href={`/apps/${slug}/features/new`}
            className={buttonVariants({ variant: 'info', size: 'sm' })}
          >
            Create feature
          </Link>
        }
        emptyState={
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Flag className="text-amber-600 dark:text-amber-400" />
              </EmptyMedia>
              <EmptyTitle>No features</EmptyTitle>
              <EmptyDescription>
                Create a feature flag for {app.name}.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Link
                href={`/apps/${slug}/features/new`}
                className={buttonVariants({ variant: 'info', size: 'sm' })}
              >
                Create feature
              </Link>
            </EmptyContent>
          </Empty>
        }
      />
    </div>
  )
}
