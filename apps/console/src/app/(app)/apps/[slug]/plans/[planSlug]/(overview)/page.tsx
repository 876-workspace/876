import { Suspense } from 'react'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { Skeleton } from '@876/ui/skeleton'

import { resolveApp, resolveProduct } from '../../../_data'
import { formatDate } from '@/lib/format'
import { InfoSection, Field } from '@/components/patterns/detail/info-section'
import { CopyChip } from '../_components/copy-chip'

type Props = { params: Promise<{ slug: string; planSlug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, planSlug } = await params
  const app = await resolveApp(slug)
  if (!app) return { title: 'Plan not found' }

  const product = await resolveProduct(app.id, planSlug)

  if (!product) return { title: 'Plan not found' }
  return { title: `${product.name} • ${app.name}` }
}

export default function PlanDetailPage({ params }: Props) {
  return (
    <Suspense fallback={<OverviewSkeleton />}>
      <PlanDetailData params={params} />
    </Suspense>
  )
}

async function PlanDetailData({ params }: Props) {
  const { slug, planSlug } = await params
  const app = await resolveApp(slug)

  if (!app || app.app_kind !== 'product') notFound()

  const product = await resolveProduct(app.id, planSlug)

  if (!product) notFound()

  const metadata = Object.entries(product.metadata ?? {})

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <InfoSection title="Plan details">
        <Field label="Plan ID" mono value={<CopyChip value={product.id} />} />
        <Field
          label="Product"
          mono
          value={<CopyChip value={product.slug || product.name} />}
        />
        <Field
          label="Statement descriptor"
          value={product.statement_descriptor || '—'}
          mono
        />
        <Field label="Created" value={formatDate(product.created_at)} />
        <Field label="Last updated" value={formatDate(product.updated_at)} />
      </InfoSection>

      <InfoSection title="Metadata">
        {metadata.length === 0 ? (
          <div className="border-border/60 bg-muted/5 flex flex-col items-center justify-center rounded-xl border border-dashed px-4 py-8 text-center">
            <span className="text-foreground mb-1 text-base font-semibold">
              No metadata
            </span>
            <p className="text-muted-foreground mb-3 max-w-[360px] text-[0.8125rem] leading-relaxed">
              Add key-value pairs to store internal references or integration
              values alongside this plan.
            </p>
          </div>
        ) : (
          <dl className="divide-876-surface-border divide-y font-mono text-[0.8125rem]">
            {metadata.map(([key, value]) => (
              <div
                key={key}
                className="group/field flex items-baseline justify-between gap-4 py-2.5 first:pt-0 last:pb-0"
              >
                <dt className="text-muted-foreground shrink-0 font-medium">
                  {key}
                </dt>
                <dd className="min-w-0 truncate text-right select-all">
                  {String(value)}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </InfoSection>
    </div>
  )
}

function OverviewSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <Skeleton className="h-72 rounded-xl" />
      <Skeleton className="h-72 rounded-xl" />
    </div>
  )
}
