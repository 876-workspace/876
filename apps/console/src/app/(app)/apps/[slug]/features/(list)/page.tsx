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
import { resolveApp } from '../../_data'
import { AppFeaturesTable } from '../_components/features-table'
import { Suspense } from 'react'
import { DataTableSkeleton } from '@876/ui/data-table-skeleton'
import { FEATURES_SKELETON_COLUMNS } from '../_components/features-skeleton-columns'

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

  return (
    <div className="space-y-5">
      <div className="mb-2">
        <h2 className="876-page-title">Feature Flags</h2>
      </div>
      <Suspense
        fallback={<DataTableSkeleton columns={FEATURES_SKELETON_COLUMNS} />}
      >
        <FeaturesTableData slug={slug} searchParams={searchParams} />
      </Suspense>
    </div>
  )
}

async function FeaturesTableData({
  slug,
  searchParams,
}: {
  slug: string
  searchParams: Props['searchParams']
}) {
  const { after, before } = await searchParams

  const app = await resolveApp(slug)
  if (!app) notFound()

  const featureResult = await $876.appFeatures.list(app.id, {
    limit: 25,
    startingAfter: after,
    endingBefore: before,
    rootOnly: true,
    excludeTag: 'widget',
  })

  if (featureResult.error) throw new Error(featureResult.error.message)

  const features = featureResult.data?.data ?? []
  const firstId = features[0]?.id ?? null
  const lastId = features.at(-1)?.id ?? null
  const hasMore = featureResult.data?.has_more ?? false

  return (
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
  )
}
