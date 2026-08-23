import { Suspense, type ReactNode } from 'react'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, CreditCard, Pencil } from '@876/ui/icons'
import { cn } from '@876/core/utils'

import { buttonVariants } from '@876/ui/button'
import { Skeleton } from '@876/ui/skeleton'
import { PlanActions } from './_components/plan-actions'
import { PlanStatusBadge, CopyChip } from './_components/copy-chip'
import { PlanTabs, type PlanTab } from './_components/plan-tabs'

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
 * The back control and tab strip do not depend on the plan at all, so they
 * are real and clickable immediately. Only the identity band and the actions
 * stream in, each into a boundary sized to match.
 */
export default async function PlanDetailLayout({ children, params }: Props) {
  const { slug, planSlug } = await params

  const base = `/apps/${slug}/plans/${planSlug}`
  const tabs: PlanTab[] = [
    { label: 'Overview', href: base, exact: true },
    { label: 'Pricing', href: `${base}/pricing` },
    { label: 'Entitlements', href: `${base}/entitlements` },
    { label: 'Subscribers', href: `${base}/subscribers` },
  ]
  const editHref = `${base}/edit`
  const plansHref = `/apps/${slug}/plans`

  return (
    <div>
      <header className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
        <div className="flex min-w-0 flex-1 items-start gap-2">
          {/* Back control sits in the header itself, beside the title — the
              plans list is one click away without spending a header row. */}
          <Link
            href={plansHref}
            aria-label="Back to plans"
            className={cn(
              buttonVariants({ variant: 'ghost', size: 'icon-sm' }),
              'mt-1.5 -ml-1 shrink-0'
            )}
          >
            <ArrowLeft className="size-4" />
          </Link>

          <Suspense fallback={<IdentityFallback />}>
            <Identity slug={slug} planSlug={planSlug} />
          </Suspense>
        </div>

        <div className="flex w-full shrink-0 gap-2 pl-9 sm:w-auto sm:justify-end sm:pl-0">
          <Link
            href={editHref}
            className={cn(
              buttonVariants({ variant: 'outline', size: 'sm' }),
              'gap-1.5'
            )}
          >
            <Pencil className="size-3.5" />
            Edit
          </Link>
          <Suspense fallback={<ActionsFallback />}>
            <PlanMenu slug={slug} planSlug={planSlug} />
          </Suspense>
        </div>
      </header>

      {/* The tab strip does not depend on the plan at all, so it is real and
          clickable immediately. */}
      <div className="mt-3">
        <PlanTabs tabs={tabs} />
      </div>

      <div className="pt-4">{children}</div>
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

async function Identity({
  slug,
  planSlug,
}: {
  slug: string
  planSlug: string
}) {
  const product = await loadPlan(slug, planSlug)

  return (
    <div className="flex min-w-0 flex-1 items-center gap-4">
      <span className="bg-muted text-muted-foreground flex size-12 shrink-0 items-center justify-center rounded-xl max-sm:hidden sm:size-14">
        <CreditCard aria-hidden="true" className="size-[1.375rem]" />
      </span>

      <div className="min-w-0 flex-1">
        <div className="mb-1 flex flex-wrap items-center gap-x-3 gap-y-1">
          <h1 className="876-page-title text-foreground min-w-0 truncate">
            {product.name}
          </h1>
          <PlanStatusBadge status={product.status} />
          <CopyChip value={product.id} className="max-w-[180px] truncate" />
        </div>
        {product.description && (
          <p className="text-muted-foreground max-w-2xl text-[0.8125rem] leading-relaxed">
            {product.description}
          </p>
        )}
      </div>
    </div>
  )
}

/** Sized to the resolved identity band so nothing shifts on hand-off. */
function IdentityFallback() {
  return (
    <div className="flex min-w-0 flex-1 items-center gap-4">
      <Skeleton className="size-14 shrink-0 rounded-xl max-sm:hidden" />
      <div className="min-w-0 flex-1">
        <div className="mb-1.5 flex items-center gap-x-3">
          <Skeleton className="h-7 w-52 max-w-full" />
          <Skeleton className="h-5 w-16 rounded-md" />
          <Skeleton className="h-4 w-28" />
        </div>
        <Skeleton className="h-5 w-80 max-w-full" />
      </div>
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

function ActionsFallback() {
  return <Skeleton className="size-8 rounded-md" />
}
