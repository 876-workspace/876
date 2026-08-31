import { workspace } from '@/lib/services/workspace'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { AppError } from '@876/ui/app-error'
import { buttonVariants } from '@876/ui/button'
import { DataTableSkeleton } from '@876/ui/data-table-skeleton'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@876/ui/empty'
import { Flag } from '@876/ui/icons'

import { resolveApp } from '../../_data'
import { AppFeaturesTable } from '../_components/features-table'
import { FEATURES_SKELETON_COLUMNS } from '../_components/features-skeleton-columns'

type Props = {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ q?: string; after?: string; before?: string }>
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
  const { q, after, before } = await searchParams
  const query = q?.trim() || undefined

  const app = await resolveApp(slug)
  if (!app) notFound()

  const [featureResult, modulesResult] = await Promise.all([
    workspace.features.list({
      appId: app.id,
      limit: 100,
      search: query,
      startingAfter: query ? undefined : after,
      endingBefore: query ? undefined : before,
    }),
    app.app_kind === 'product'
      ? workspace.modules.list(app.id, { includeArchived: false })
      : Promise.resolve({ data: null, error: null }),
  ])

  if (featureResult.error)
    return (
      <AppError
        title="Feature flags are temporarily unavailable"
        error={featureResult.error}
        variant="banner"
        showCode
      />
    )

  const features = featureResult.data?.data ?? []
  const moduleFeatureIds = (modulesResult.data?.data ?? [])
    .filter((module) => module.status === 'active' && module.feature_id)
    .map((module) => module.feature_id as string)

  return (
    <div className="space-y-3">
      {modulesResult.error ? (
        <AppError
          title="Module associations are temporarily unavailable"
          error={modulesResult.error}
          variant="inline"
          showCode
        />
      ) : null}
      <AppFeaturesTable
        appSlug={slug}
        data={features}
        query={q ?? ''}
        moduleFeatureIds={moduleFeatureIds}
        hasMore={featureResult.data?.has_more ?? false}
        firstId={features[0]?.id ?? null}
        lastId={features.at(-1)?.id ?? null}
        toolbarAction={
          <div className="flex gap-2">
            <Link
              href={`/apps/${slug}/features/diagnostics`}
              className={buttonVariants({ variant: 'outline', size: 'sm' })}
            >
              Diagnose access
            </Link>
            <Link
              href={`/apps/${slug}/features/new`}
              className={buttonVariants({ variant: 'info', size: 'sm' })}
            >
              Create feature
            </Link>
          </div>
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
