import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { ResourceToolbar } from '@876/ui/resource-toolbar'
import {
  StatusFilterHeading,
  type StatusFilterOption,
} from '@876/ui/status-filter-heading'

import { resolveApp, resolveProduct } from '../../../../_data'
import {
  PlanPricingTable,
  type PricingSetup,
} from '../_components/plan-pricing-table'
import { buildPricingSetup } from '../_lib/build-pricing-setup'

type Props = {
  params: Promise<{ slug: string; planSlug: string }>
  searchParams: Promise<{ status?: string }>
}

const PRICE_STATUS_OPTIONS: StatusFilterOption[] = [
  { value: 'all', label: 'All Pricing' },
  { value: 'active', label: 'Active' },
  { value: 'archived', label: 'Archived' },
]

function isPriceStatus(status: string | undefined): boolean {
  return status === 'active' || status === 'archived'
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, planSlug } = await params
  const app = await resolveApp(slug)
  if (!app) return { title: 'Plan Pricing not found' }

  const product = await resolveProduct(app.id, planSlug)
  if (!product) return { title: 'Plan not found' }
  return { title: `${product.name} Pricing • ${app.name}` }
}

export default async function PlanPricingPage({ params, searchParams }: Props) {
  const { slug, planSlug } = await params
  const { status } = await searchParams

  // Unknown or missing status resolves to all — never an API error.
  const priceStatus = isPriceStatus(status) ? status : undefined
  const selectedStatus = priceStatus ?? 'all'

  const setup = await loadPricingSetup(slug, planSlug, priceStatus)

  return (
    <div className="space-y-4">
      <ResourceToolbar
        title="Pricing"
        titleFilter={
          <StatusFilterHeading
            label="Pricing"
            value={selectedStatus}
            options={PRICE_STATUS_OPTIONS}
          />
        }
        primaryLabel="Add"
        primaryHref={setup.newHref}
        primaryVariant="info"
        refresh
      />
      <div className="876-card overflow-hidden">
        <PlanPricingTable setup={setup} />
      </div>
    </div>
  )
}

async function loadPricingSetup(
  slug: string,
  planSlug: string,
  status?: string
): Promise<PricingSetup> {
  const app = await resolveApp(slug)
  if (!app || app.app_kind !== 'product') notFound()

  const product = await resolveProduct(app.id, planSlug)
  if (!product) notFound()

  return buildPricingSetup({
    slug,
    planSlug,
    productId: product.id,
    prices: (product.prices ?? []).filter(
      (price) => !status || price.status === status
    ),
  })
}
