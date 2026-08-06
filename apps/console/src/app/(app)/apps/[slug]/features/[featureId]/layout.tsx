import type { Metadata } from 'next'
import { Suspense, type ReactNode } from 'react'
import { notFound } from 'next/navigation'
import type { AdminApp } from '@876/admin'

import { RouteTabs, type RouteTabItem as DetailTab } from '@876/ui/route-tabs'
import { Skeleton } from '@876/ui/skeleton'
import { FeatureHeader } from '@/features/access/components/feature-header'
import { resolveFeature } from '../../../../features/[id]/_data'
import { resolveApp } from '../../_data'

type Props = {
  children: ReactNode
  params: Promise<{ slug: string; featureId: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, featureId } = await params
  const [app, feature] = await Promise.all([
    resolveApp(slug),
    resolveFeature(featureId),
  ])
  if (!app || !feature || feature.app_id !== app.id)
    return { title: 'Feature not found' }

  return { title: `${feature.name} - ${app.name} Features` }
}

/**
 * The nested feature shell.
 *
 * Awaits `params` only. A layout renders outside its own `loading.tsx`, so an
 * await here suspends into the *parent* segment's boundary — the app's features
 * list — and nothing this route owns can catch it.
 *
 * `FeatureHeader` is a client component, so `notFound()` cannot live inside it;
 * the resolve-and-decide step stays in a server component behind the boundary,
 * which also keeps the header's existing `apps`-as-a-promise contract intact.
 */
export default async function AppFeatureDetailLayout({
  children,
  params,
}: Props) {
  const { slug, featureId } = await params

  const base = `/apps/${slug}/features/${featureId}`
  const returnHref = `/apps/${slug}/features`
  const tabs: DetailTab[] = [
    { label: 'Details', href: base, exact: true },
    { label: 'Access', href: `${base}/access` },
    { label: 'Rules & Values', href: `${base}/config` },
    { label: 'History', href: `${base}/audit` },
  ]

  return (
    <div className="flex flex-col gap-6">
      <div className="-mx-4 sm:-mx-6 lg:-mx-8">
        <Suspense fallback={<FeatureHeaderFallback tabs={tabs} />}>
          <ResolvedFeatureHeader
            slug={slug}
            featureId={featureId}
            tabs={tabs}
            returnHref={returnHref}
          />
        </Suspense>
      </div>

      {children}
    </div>
  )
}

/** Decides the route exists, so `notFound()` belongs here rather than the shell. */
async function ResolvedFeatureHeader({
  slug,
  featureId,
  tabs,
  returnHref,
}: {
  slug: string
  featureId: string
  tabs: DetailTab[]
  returnHref: string
}) {
  const [app, feature] = await Promise.all([
    resolveApp(slug),
    resolveFeature(featureId),
  ])
  if (!app || !feature || feature.app_id !== app.id) notFound()

  // Already resolved — the app is required by the guard above — but FeatureHeader
  // takes a promise so the /features/[id] layout can pass an unawaited one.
  const apps: Promise<AdminApp[]> = Promise.resolve([app])

  return (
    <FeatureHeader
      feature={feature}
      apps={apps}
      tabs={tabs}
      appSlug={slug}
      returnHref={returnHref}
      isNested={true}
    />
  )
}

/**
 * Mirrors the header's frame so the tabs stay real and in place while the
 * feature resolves — only the flag, name and slug line shimmer.
 */
function FeatureHeaderFallback({ tabs }: { tabs: DetailTab[] }) {
  return (
    <div className="relative">
      <div className="flex items-center justify-between gap-4 px-4 py-2 sm:px-6 lg:px-8">
        <div className="flex min-w-0 flex-1 items-center gap-8 overflow-x-auto">
          <div className="flex shrink-0 items-center">
            <div className="flex items-center gap-3">
              <Skeleton className="size-5 rounded" />
              <div className="flex flex-col justify-center gap-1">
                <Skeleton className="h-6 w-44" />
                <Skeleton className="h-3 w-32" />
              </div>
            </div>
          </div>
          <div className="shrink-0">
            <RouteTabs tabs={tabs} variant="pill" />
          </div>
        </div>
        <div className="ml-auto flex shrink-0 items-center pl-2">
          <Skeleton className="h-8 w-20" />
        </div>
      </div>
    </div>
  )
}
