import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { resolveApp, resolveProduct } from '../../../_data'
import {
  PlanPricingTable,
  type PricingSetup,
} from './_components/plan-pricing-table'
import { buildPricingSetup } from './_lib/build-pricing-setup'

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
      <PlanPricingTable setup={setup} />
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

  return buildPricingSetup({
    slug,
    planSlug,
    productId: product.id,
    prices: product.prices,
  })
}
