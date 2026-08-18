import { Suspense } from 'react'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Skeleton } from '@876/ui/skeleton'

import { $876 } from '@/lib/876'
import { resolveApp } from '../../../_data'
import { PricingTable } from './_components/pricing-table'

type Props = { params: Promise<{ slug: string; planSlug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, planSlug } = await params
  const app = await resolveApp(slug)
  if (!app) return { title: 'Plan Pricing not found' }

  const { data } = await $876.entitlementPlans.admin.list({ appId: app.id })
  const products = data?.data ?? []
  const product = products.find((p) => p.slug === planSlug || p.id === planSlug)

  if (!product) return { title: 'Plan not found' }
  return { title: `${product.name} Pricing • ${app.name}` }
}

type PriceItem = {
  id: string
  name: string | null
  nickname: string | null
  unit_amount: number
  currency: string
  billing_interval: string | null
  status: string
}

export default function PlanPricingPage({ params }: Props) {
  return (
    <div className="space-y-5">
      <div className="mb-2">
        <h2 className="text-lg font-medium tracking-tight">Pricing</h2>
      </div>
      <Suspense fallback={<Skeleton className="h-72 w-full rounded-lg" />}>
        <PlanPricingData params={params} />
      </Suspense>
    </div>
  )
}

async function PlanPricingData({ params }: Props) {
  const { slug, planSlug } = await params
  const app = await resolveApp(slug)

  if (!app || app.app_kind !== 'product') notFound()

  const { data } = await $876.entitlementPlans.admin.list({ appId: app.id })
  const products = data?.data ?? []

  const product = products.find((p) => p.slug === planSlug || p.id === planSlug)
  if (!product) notFound()

  const pricesData: PriceItem[] = (product.prices || []).map((p) => ({
    id: p.id,
    name: p.name ?? null,
    nickname: p.nickname ?? null,
    unit_amount: p.unit_amount,
    currency: p.currency,
    billing_interval: p.billing_interval ?? null,
    status: p.status,
  }))

  return <PricingTable prices={pricesData} productId={product.id} />
}
