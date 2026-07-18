import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Pencil, Plus } from '@876/ui/icons'

import { cn } from '@876/core/utils'
import { Button } from '@876/ui/button'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardAction,
} from '@876/ui/card'
import { Separator } from '@876/ui/separator'

import { $876 } from '@/lib/876'
import { resolveApp } from '../../_data'
import { formatDate } from '@/lib/format'

type Props = { params: Promise<{ slug: string; planSlug: string }> }

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

function CopyChip({ value, className }: { value: string; className?: string }) {
  return (
    <code
      className={cn(
        'bg-secondary/40 text-muted-foreground/90 rounded px-1.5 py-0.5 font-mono text-[10px] select-all',
        className
      )}
    >
      {value}
    </code>
  )
}

export default async function PlanDetailPage({ params }: Props) {
  const { slug, planSlug } = await params
  const app = await resolveApp(slug)

  if (!app || app.app_kind !== 'product') notFound()

  const { data } = await $876.products.list({ appId: app.id })
  const products = data?.data ?? []

  const product = products.find((p) => p.slug === planSlug || p.id === planSlug)

  if (!product) notFound()

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* Plan Details Card */}
      <Card className="876-card bg-[var(--876-surface)] ring-0">
        <CardHeader className="flex items-center justify-between px-5 py-4">
          <CardTitle className="text-foreground text-sm font-semibold">
            Plan details
          </CardTitle>
          <CardAction>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Edit plan details"
              disabled
              className="text-muted-foreground hover:text-foreground"
            >
              <Pencil className="size-3.5" />
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent className="p-5 pt-0">
          <dl className="flex flex-col gap-3.5">
            <div className="flex items-center justify-between gap-4">
              <dt className="text-muted-foreground text-xs">Plan ID</dt>
              <dd className="min-w-0 text-right">
                <CopyChip value={product.id} />
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-muted-foreground text-xs">Product</dt>
              <dd className="min-w-0 text-right">
                <CopyChip value={product.slug || product.name} />
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-muted-foreground text-xs">
                Statement descriptor
              </dt>
              <dd className="text-foreground min-w-0 text-right font-mono text-xs">
                {product.statement_descriptor || '—'}
              </dd>
            </div>
            <Separator className="bg-border/40 my-1" />
            <div className="flex items-center justify-between gap-4">
              <dt className="text-muted-foreground text-xs">Created</dt>
              <dd className="text-foreground min-w-0 text-right text-xs font-medium">
                {formatDate(product.created_at)}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-muted-foreground text-xs">Last updated</dt>
              <dd className="text-foreground min-w-0 text-right text-xs font-medium">
                {formatDate(product.updated_at)}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {/* Metadata Card */}
      <Card className="876-card bg-[var(--876-surface)] ring-0">
        <CardHeader className="flex items-center justify-between px-5 py-4">
          <CardTitle className="text-foreground text-sm font-semibold">
            Metadata
          </CardTitle>
          <CardAction>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Edit metadata"
              disabled
              className="text-muted-foreground hover:text-foreground"
            >
              <Pencil className="size-3.5" />
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent className="p-5 pt-0">
          {!product.metadata || Object.keys(product.metadata).length === 0 ? (
            <div className="border-border/60 bg-muted/5 flex flex-col items-center justify-center rounded-xl border border-dashed px-4 py-6 text-center">
              <span className="text-foreground mb-1 text-base font-semibold">
                No metadata
              </span>
              <p className="text-muted-foreground mb-3 max-w-[360px] text-sm leading-relaxed">
                Add metadata to store internal references or integration values.
              </p>
              <Button
                size="sm"
                variant="outline"
                className="h-7 gap-1 px-2.5 text-xs"
                disabled
              >
                <Plus className="size-3" />
                Add metadata
              </Button>
            </div>
          ) : (
            <dl className="border-border/40 bg-muted/5 flex flex-col overflow-hidden rounded-lg border font-mono text-xs">
              {Object.entries(product.metadata).map(([key, value], i) => (
                <div
                  key={key}
                  className={cn(
                    'flex items-center justify-between gap-4 px-3 py-2',
                    i > 0 && 'border-border/40 border-t'
                  )}
                >
                  <dt className="text-muted-foreground font-medium">{key}</dt>
                  <dd className="text-foreground truncate select-all">
                    {String(value)}
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
