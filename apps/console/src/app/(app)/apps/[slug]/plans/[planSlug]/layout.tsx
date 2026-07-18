import type { ReactNode } from 'react'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ExternalLink, Pencil } from '@876/ui/icons'
import { cn } from '@876/core/utils'

import { Button, buttonVariants } from '@876/ui/button'
import { Badge } from '@876/ui/badge'
import { RouteTabs, type RouteTabItem as DetailTab } from '@876/ui/route-tabs'
import { PlanActions } from './plan-actions'

import { $876 } from '@/lib/876'
import { resolveApp } from '../../_data'

type Props = {
  children: ReactNode
  params: Promise<{ slug: string; planSlug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, planSlug } = await params
  const app = await resolveApp(slug)
  if (!app) return { title: 'Plan not found' }

  const { data } = await $876.products.list({ appId: app.id })
  const products = data?.data ?? []
  const product = products.find((p) => p.slug === planSlug || p.id === planSlug)

  if (!product) return { title: 'Plan not found' }
  return { title: `${product.name} • ${app.name}` }
}

export default async function PlanDetailLayout({ children, params }: Props) {
  const { slug, planSlug } = await params
  const app = await resolveApp(slug)
  if (!app || app.app_kind !== 'product') notFound()

  const { data } = await $876.products.list({ appId: app.id })
  const products = data?.data ?? []
  const product = products.find((p) => p.slug === planSlug || p.id === planSlug)
  if (!product) notFound()

  const base = `/apps/${slug}/plans/${planSlug}`
  const tabs: DetailTab[] = [
    { label: 'Overview', href: base, exact: true },
    { label: 'Pricing', href: `${base}/pricing` },
    { label: 'Entitlements', href: `${base}/entitlements` },
    { label: 'Subscribers', href: `${base}/subscribers` },
  ]
  const editHref = `/apps/${slug}/plans/${planSlug}/edit`

  return (
    <div className="max-w-[1120px] space-y-6">
      <header className="flex flex-col gap-4">
        <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
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
            <PlanActions
              productId={product.id}
              productName={product.name}
              productStatus={product.status}
            />
          </div>
        </div>

        {/* Quick Summary Metrics Strip */}
        <div className="876-card grid grid-cols-2 gap-6 bg-[var(--876-surface)] p-4 ring-0 md:grid-cols-4 md:px-6 md:py-4">
          <div className="flex flex-col gap-0.5">
            <span className="text-muted-foreground/80 text-[10px] font-bold tracking-wider uppercase">
              MRR
            </span>
            <span className="text-foreground text-lg font-semibold tabular-nums">
              $0.00
            </span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-muted-foreground/80 text-[10px] font-bold tracking-wider uppercase">
              Subscribers
            </span>
            <span className="text-foreground text-lg font-semibold tabular-nums">
              0
            </span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-muted-foreground/80 text-[10px] font-bold tracking-wider uppercase">
              Billing
            </span>
            <span className="text-foreground text-lg font-semibold capitalize">
              Monthly
            </span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-muted-foreground/80 text-[10px] font-bold tracking-wider uppercase">
              Entitlements
            </span>
            <span className="text-foreground text-lg font-semibold tabular-nums">
              {product.module_ids.length}
            </span>
          </div>
        </div>

        <div className="mt-2">
          <RouteTabs tabs={tabs} variant="pill" />
        </div>
      </header>

      <div>{children}</div>
    </div>
  )
}
