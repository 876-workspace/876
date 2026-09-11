import type { Metadata } from 'next'
import { Suspense, type ReactNode } from 'react'
import { notFound } from 'next/navigation'

import { Badge } from '@876/ui/badge'
import { Skeleton } from '@876/ui/skeleton'
import {
  DetailCard,
  DetailCardBody,
  DetailCardHeader,
  DetailCardMeta,
  DetailCardMetaItem,
  DetailCardRouteTabs,
} from '@876/ui/detail-card'
import type { RouteTabItem as DetailTab } from '@876/ui/route-tabs'
import { Flag } from '@876/ui/icons'
import { cn } from '@876/core/utils'
import { FeatureToolbar } from '@/features/access/components/feature-actions'
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
 * The feature detail card. It renders in the section layout's detail column
 * beside the persistent feature flags list.
 *
 * The frame awaits `params` and nothing else. Data streams into Suspense
 * islands sized to match, through the same request-cached resolvers the pages
 * beneath use, so this costs one fetch, not several. The tab strip does not
 * depend on the feature at all, so it is real and clickable immediately.
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
    <DetailCard aria-label="Feature">
      <Suspense fallback={<FeatureCardHeaderSkeleton />}>
        <FeatureCardHeader
          slug={slug}
          featureId={featureId}
          returnHref={returnHref}
        />
      </Suspense>
      <DetailCardRouteTabs tabs={tabs} />
      <DetailCardBody>{children}</DetailCardBody>
    </DetailCard>
  )
}

/**
 * The card header. This is the one piece that decides the route exists, so
 * `notFound()` lives here — the pages under this layout already do the same
 * for their own data.
 */
async function FeatureCardHeader({
  slug,
  featureId,
  returnHref,
}: {
  slug: string
  featureId: string
  returnHref: string
}) {
  const [app, feature] = await Promise.all([
    resolveApp(slug),
    resolveFeature(featureId),
  ])
  if (!app || !feature || feature.app_id !== app.id) notFound()

  return (
    <DetailCardHeader
      icon={
        <span className="bg-muted flex size-14 shrink-0 items-center justify-center rounded-xl">
          <Flag
            aria-hidden="true"
            className={cn(
              'size-6',
              feature.enabled
                ? 'text-green-500'
                : 'text-zinc-400 dark:text-zinc-500'
            )}
            strokeWidth={2.5}
          />
        </span>
      }
      title={feature.name}
      meta={
        <Badge variant={feature.enabled ? 'success' : 'secondary'}>
          {feature.enabled ? 'On' : 'Off'}
        </Badge>
      }
      subtitle={
        <DetailCardMeta>
          <DetailCardMetaItem>{feature.slug}</DetailCardMetaItem>
          <DetailCardMetaItem className="capitalize">
            {feature.scope}
          </DetailCardMetaItem>
        </DetailCardMeta>
      }
      actions={
        <Suspense fallback={<Skeleton className="h-8 w-20" />}>
          <FeatureToolbar
            feature={feature}
            apps={[app]}
            appSlug={slug}
            returnHref={returnHref}
          />
        </Suspense>
      }
      closeHref={returnHref}
      closeLabel="Close feature details"
    />
  )
}

function FeatureCardHeaderSkeleton() {
  return (
    <DetailCardHeader
      icon={<Skeleton className="size-14 shrink-0 rounded-xl" />}
      title={<Skeleton className="h-6 w-44" />}
      subtitle={<Skeleton className="h-3.5 w-48" />}
      actions={<Skeleton className="h-8 w-20" />}
      closeHref="/apps"
      closeLabel="Close feature details"
    />
  )
}
