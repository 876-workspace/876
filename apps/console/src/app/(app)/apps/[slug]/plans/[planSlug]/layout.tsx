import { Suspense, type ReactNode } from 'react'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { CreditCard, Pencil } from '@876/ui/icons'
import { cn } from '@876/core/utils'

import { buttonVariants } from '@876/ui/button'
import { Skeleton } from '@876/ui/skeleton'
import {
  DetailCard,
  DetailCardBody,
  DetailCardHeader,
  DetailCardMeta,
  DetailCardMetaItem,
  DetailCardRouteTabs,
} from '@876/ui/detail-card'
import type { RouteTabItem } from '@876/ui/route-tabs'
import { PlanActions } from './_components/plan-actions'
import { PlanStatusBadge, CopyChip } from './_components/copy-chip'

import { resolveApp, resolveProduct } from '../../_data'

type Props = {
  children: ReactNode
  params: Promise<{ slug: string; planSlug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, planSlug } = await params
  const app = await resolveApp(slug)
  if (!app) return { title: 'Plan not found' }

  // Through the memoized resolver, so this shares the render's product fetch
  // instead of listing them a second time.
  const product = await resolveProduct(app.id, planSlug)

  if (!product) return { title: 'Plan not found' }
  return { title: `${product.name} • ${app.name}` }
}

/**
 * The plan detail card. It renders in the section layout's detail column
 * beside the persistent plans list.
 *
 * The frame awaits `params` and nothing else. Data streams into Suspense
 * islands sized to match, and every island calls the same request-cached
 * resolvers, so this costs one fetch, not several. The tab strip does not
 * depend on the plan at all, so it is real and clickable immediately.
 */
export default async function PlanDetailLayout({ children, params }: Props) {
  const { slug, planSlug } = await params

  const base = `/apps/${slug}/plans/${planSlug}`
  const tabs: RouteTabItem[] = [
    { label: 'Overview', href: base, exact: true },
    { label: 'Pricing', href: `${base}/pricing` },
    { label: 'Entitlements', href: `${base}/entitlements` },
    { label: 'Subscribers', href: `${base}/subscribers` },
  ]
  const plansHref = `/apps/${slug}/plans`

  return (
    <DetailCard aria-label="Plan">
      <Suspense fallback={<PlanCardHeaderSkeleton />}>
        <PlanCardHeader slug={slug} planSlug={planSlug} closeHref={plansHref} />
      </Suspense>
      <DetailCardRouteTabs tabs={tabs} />
      <DetailCardBody>{children}</DetailCardBody>
    </DetailCard>
  )
}

/** Resolves the plan, or decides the route does not exist. */
async function loadPlan(slug: string, planSlug: string) {
  const app = await resolveApp(slug)
  if (!app || app.app_kind !== 'product') notFound()

  const product = await resolveProduct(app.id, planSlug)
  if (!product) notFound()

  return product
}

/**
 * The card header. This is the one piece that decides the route exists, so
 * `notFound()` lives here — the pages under this layout already do the same
 * for their own data.
 */
async function PlanCardHeader({
  slug,
  planSlug,
  closeHref,
}: {
  slug: string
  planSlug: string
  closeHref: string
}) {
  const product = await loadPlan(slug, planSlug)

  return (
    <DetailCardHeader
      icon={
        <span className="bg-muted text-muted-foreground flex size-14 shrink-0 items-center justify-center rounded-xl">
          <CreditCard aria-hidden="true" className="size-[1.375rem]" />
        </span>
      }
      title={product.name}
      meta={
        <>
          <PlanStatusBadge status={product.status} />
          <CopyChip value={product.id} className="max-w-[180px] truncate" />
        </>
      }
      subtitle={
        <DetailCardMeta>
          <DetailCardMetaItem>{product.slug}</DetailCardMetaItem>
        </DetailCardMeta>
      }
      actions={
        <>
          <Link
            href={`/apps/${slug}/plans/${planSlug}/edit`}
            className={cn(
              buttonVariants({ variant: 'outline', size: 'sm' }),
              'gap-1.5'
            )}
          >
            <Pencil className="size-3.5" />
            Edit
          </Link>
          <Suspense fallback={<Skeleton className="size-8 rounded-md" />}>
            <PlanMenu slug={slug} planSlug={planSlug} />
          </Suspense>
        </>
      }
      closeHref={closeHref}
      closeLabel="Close plan details"
    />
  )
}

function PlanCardHeaderSkeleton() {
  return (
    <DetailCardHeader
      icon={<Skeleton className="size-14 shrink-0 rounded-xl" />}
      title={<Skeleton className="h-6 w-44" />}
      subtitle={<Skeleton className="h-3.5 w-40" />}
      actions={<Skeleton className="h-8 w-24" />}
      closeHref="/apps"
      closeLabel="Close plan details"
    />
  )
}

async function PlanMenu({
  slug,
  planSlug,
}: {
  slug: string
  planSlug: string
}) {
  const product = await loadPlan(slug, planSlug)

  return (
    <PlanActions
      productId={product.id}
      productName={product.name}
      productStatus={product.status}
    />
  )
}
