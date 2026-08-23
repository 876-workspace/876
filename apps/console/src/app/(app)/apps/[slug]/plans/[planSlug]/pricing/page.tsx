import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { resolveApp, resolveProduct } from '../../../_data'
import {
  PricingTable,
  type PriceItem,
  type PricingSetup,
} from './_components/pricing-table'

type Props = { params: Promise<{ slug: string; planSlug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, planSlug } = await params
  const app = await resolveApp(slug)
  if (!app) return { title: 'Plan Pricing not found' }

  const product = await resolveProduct(app.id, planSlug)
  if (!product) return { title: 'Plan not found' }
  return { title: `${product.name} Pricing • ${app.name}` }
}

export default async function PlanPricingPage({ params }: Props) {
  const { slug, planSlug } = await params
  const setup = await loadPricingSetup(slug, planSlug)

  return (
    <div className="space-y-5">
      <div className="mb-2">
        <h2 className="text-lg font-medium tracking-tight">Pricing</h2>
      </div>
      <PricingTable setup={setup} />
    </div>
  )
}

async function loadPricingSetup(
  slug: string,
  planSlug: string
): Promise<PricingSetup> {
  const app = await resolveApp(slug)
  if (!app || app.app_kind !== 'product') notFound()

  const product = await resolveProduct(app.id, planSlug)
  if (!product) notFound()

  const prices: PriceItem[] = (product.prices || []).map((price) => ({
    id: price.id,
    name: price.name ?? null,
    nickname: price.nickname ?? null,
    unit_amount: price.unit_amount,
    currency: price.currency,
    billing_interval: price.billing_interval ?? null,
    interval_count: price.interval_count ?? null,
    billing_scheme: price.billing_scheme,
    tiers_mode: price.tiers_mode ?? null,
    trial_period_days: price.trial_period_days ?? null,
    tax_behavior: price.tax_behavior ?? null,
    status: price.status,
  }))

  const base = `/apps/${slug}/plans/${planSlug}/pricing`
  return {
    productId: product.id,
    prices,
    newHref: `${base}/new`,
    basePath: base,
  }
}
