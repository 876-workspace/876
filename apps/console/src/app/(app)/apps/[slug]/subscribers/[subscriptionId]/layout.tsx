import { Suspense, type ReactNode } from 'react'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { cn } from '@876/core/utils'

import { Skeleton } from '@876/ui/skeleton'
import {
  DetailCard,
  DetailCardBody,
  DetailCardHeader,
  DetailCardMeta,
  DetailCardMetaItem,
} from '@876/ui/detail-card'
import { statusBadgeClass } from '@/lib/format'
import {
  resolveApp,
  resolveOrganization,
  resolveSubscription,
} from '../../_data'

type Props = {
  children: ReactNode
  params: Promise<{ slug: string; subscriptionId: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const app = await resolveApp(slug)
  if (!app) return { title: 'Subscription details' }
  return { title: `Subscription details • ${app.name}` }
}

/**
 * The subscription detail card. It renders in the section layout's detail
 * column beside the persistent subscribers list.
 *
 * The frame awaits `params` and nothing else. Data streams into a Suspense
 * island sized to match, through the same request-cached resolvers the page
 * beneath uses, so this costs one fetch, not several.
 */
export default async function SubscriptionDetailLayout({
  children,
  params,
}: Props) {
  const { slug, subscriptionId } = await params
  const closeHref = `/apps/${slug}/subscribers`

  return (
    <DetailCard aria-label="Subscription">
      <Suspense fallback={<SubscriptionCardHeaderSkeleton />}>
        <SubscriptionCardHeader
          slug={slug}
          subscriptionId={subscriptionId}
          closeHref={closeHref}
        />
      </Suspense>
      <DetailCardBody>{children}</DetailCardBody>
    </DetailCard>
  )
}

/**
 * The card header. This is the one piece that decides the route exists, so
 * `notFound()` lives here — the page under this layout already does the same
 * for its own data.
 */
async function SubscriptionCardHeader({
  slug,
  subscriptionId,
  closeHref,
}: {
  slug: string
  subscriptionId: string
  closeHref: string
}) {
  const app = await resolveApp(slug)
  if (!app || app.app_kind !== 'product') notFound()

  const subscription = await resolveSubscription(app.id, subscriptionId)
  if (!subscription) notFound()

  const org = await resolveOrganization(subscription.organization_id)
  const name = org?.name ?? org?.slug ?? subscription.organization_id

  return (
    <DetailCardHeader
      title={name}
      meta={
        <span
          className={cn(
            'inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium capitalize',
            statusBadgeClass(subscription.status)
          )}
        >
          {subscription.status.replaceAll('_', ' ')}
        </span>
      }
      subtitle={
        <DetailCardMeta>
          <DetailCardMetaItem>{subscription.id}</DetailCardMetaItem>
        </DetailCardMeta>
      }
      closeHref={closeHref}
      closeLabel="Close subscription details"
    />
  )
}

function SubscriptionCardHeaderSkeleton() {
  return (
    <DetailCardHeader
      title={<Skeleton className="h-6 w-44" />}
      subtitle={<Skeleton className="h-3.5 w-56" />}
      closeHref="/apps"
      closeLabel="Close subscription details"
    />
  )
}
