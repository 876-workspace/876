import { Suspense, type ReactNode } from 'react'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ExternalLink, Pencil } from '@876/ui/icons'
import { cn } from '@876/core/utils'

import { Button, buttonVariants } from '@876/ui/button'
import { Badge } from '@876/ui/badge'
import { Skeleton } from '@876/ui/skeleton'
import { RouteTabs, type RouteTabItem as DetailTab } from '@876/ui/route-tabs'
import { PlanActions } from './_components/plan-actions'

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
 * The plan detail shell.
 *
 * Awaits `params` only. An await out here suspends into the *parent* segment's
 * boundary — the plans list you just clicked from — and, because a layout
 * renders outside its own `loading.tsx`, nothing this route owns can catch it.
 * That is what made opening a plan sit on the previous screen.
 *
 * The tab strip does not depend on the plan at all, so it is real and clickable
 * immediately. Only the parts that read the record stream in.
 */
export default async function PlanDetailLayout({ children, params }: Props) {
  const { slug, planSlug } = await params

  const base = `/apps/${slug}/plans/${planSlug}`
  const tabs: DetailTab[] = [
    { label: 'Overview', href: base, exact: true },
    { label: 'Pricing', href: `${base}/pricing` },
    { label: 'Entitlements', href: `${base}/entitlements` },
    { label: 'Subscribers', href: `${base}/subscribers` },
  ]
  const editHref = `${base}/edit`

  return (
    <div className="max-w-[1120px] space-y-6">
      <header className="flex flex-col gap-4">
        <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
          <Suspense fallback={<PlanIdentityFallback />}>
            <PlanIdentity slug={slug} planSlug={planSlug} />
          </Suspense>

          <div className="flex shrink-0 items-center gap-2">
            <Button variant="outline" size="sm" className="gap-1.5" disabled>
              <ExternalLink className="size-3.5" />
              View in Stripe
            </Button>
            <Link
              href={editHref}
              className={cn(
                buttonVariants({ variant: 'outline', size: 'sm' }),
                'gap-1.5'
              )}
            >
              <Pencil className="size-3.5" />
              Edit plan
            </Link>
            <Suspense fallback={<PlanActionsFallback />}>
              <PlanMenu slug={slug} planSlug={planSlug} />
            </Suspense>
          </div>
        </div>

        <Suspense fallback={<MetricsStrip entitlements={null} />}>
          <PlanMetrics slug={slug} planSlug={planSlug} />
        </Suspense>

        <div className="mt-2">
          <RouteTabs tabs={tabs} variant="pill" />
        </div>
      </header>

      <div>{children}</div>
    </div>
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

async function PlanIdentity({
  slug,
  planSlug,
}: {
  slug: string
  planSlug: string
}) {
  const product = await loadPlan(slug, planSlug)

  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="876-page-title text-foreground">{product.name}</h1>
        <Badge
          className={
            product.status === 'active'
              ? 'border-0 bg-emerald-500/10 px-2 py-0.5 font-medium text-emerald-500 hover:bg-emerald-500/10'
              : 'bg-muted text-muted-foreground border-0 px-2 py-0.5'
          }
        >
          {product.status === 'active' && (
            <span
              className="mr-1.5 size-1.5 rounded-full bg-emerald-500"
              aria-hidden="true"
            />
          )}
          <span className="text-[11px] capitalize">{product.status}</span>
        </Badge>
        <span className="text-muted-foreground/60 font-mono text-xs select-all">
          {product.id}
        </span>
      </div>
      {product.description && (
        <p className="text-muted-foreground max-w-xl text-sm leading-relaxed">
          {product.description}
        </p>
      )}
    </div>
  )
}

/** Sized to the resolved identity band so nothing shifts on hand-off. */
function PlanIdentityFallback() {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <div className="flex flex-wrap items-center gap-3">
        <Skeleton className="h-7 w-52" />
        <Skeleton className="h-5 w-16 rounded-md" />
        <Skeleton className="h-4 w-28" />
      </div>
      <Skeleton className="h-5 w-80 max-w-full" />
    </div>
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

function PlanActionsFallback() {
  return <Skeleton className="size-8 rounded-md" />
}

async function PlanMetrics({
  slug,
  planSlug,
}: {
  slug: string
  planSlug: string
}) {
  const product = await loadPlan(slug, planSlug)
  return <MetricsStrip entitlements={product.module_ids.length} />
}

/**
 * MRR, Subscribers and Billing are placeholders today, so they are as true
 * before the plan resolves as after — only the entitlement count waits.
 */
function MetricsStrip({ entitlements }: { entitlements: number | null }) {
  return (
    <div className="876-card grid grid-cols-2 gap-6 bg-[var(--876-surface)] p-4 ring-0 md:grid-cols-4 md:px-6 md:py-4">
      <Metric label="MRR" value="$0.00" />
      <Metric label="Subscribers" value="0" />
      <Metric label="Billing" value="Monthly" className="capitalize" />
      <Metric
        label="Entitlements"
        value={entitlements === null ? null : String(entitlements)}
      />
    </div>
  )
}

function Metric({
  label,
  value,
  className,
}: {
  label: string
  value: string | null
  className?: string
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-muted-foreground/80 text-[10px] font-bold tracking-wider uppercase">
        {label}
      </span>
      {value === null ? (
        <Skeleton className="h-7 w-10" />
      ) : (
        <span
          className={cn(
            'text-foreground text-lg font-semibold tabular-nums',
            className
          )}
        >
          {value}
        </span>
      )}
    </div>
  )
}
