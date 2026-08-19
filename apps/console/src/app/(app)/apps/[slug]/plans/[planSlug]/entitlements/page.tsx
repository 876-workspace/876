import { Suspense } from 'react'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Skeleton } from '@876/ui/skeleton'

import { $876 } from '@/lib/876'
import { resolveApp } from '../../../_data'
import { EntitlementsTable } from './_components/entitlements-table'

type Props = { params: Promise<{ slug: string; planSlug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, planSlug } = await params
  const app = await resolveApp(slug)
  if (!app) return { title: 'Plan Entitlements not found' }

  const { data } = await $876.entitlementPlans.admin.list({ appId: app.id })
  const products = data?.data ?? []
  const product = products.find((p) => p.slug === planSlug || p.id === planSlug)

  if (!product) return { title: 'Plan not found' }
  return { title: `${product.name} Entitlements • ${app.name}` }
}

export default function PlanEntitlementsPage({ params }: Props) {
  return (
    <div className="space-y-5">
      <div className="mb-2">
        <h2 className="text-lg font-medium tracking-tight">Entitlements</h2>
      </div>
      <Suspense fallback={<Skeleton className="h-80 w-full rounded-lg" />}>
        <PlanEntitlementsData params={params} />
      </Suspense>
    </div>
  )
}

async function PlanEntitlementsData({ params }: Props) {
  const { slug, planSlug } = await params
  const app = await resolveApp(slug)

  if (!app || app.app_kind !== 'product') notFound()

  const [productsResult, modulesResult] = await Promise.all([
    $876.entitlementPlans.admin.list({ appId: app.id }),
    $876.modules.list(app.id, { includeArchived: true }),
  ])
  const products = productsResult.data?.data ?? []

  const product = products.find((p) => p.slug === planSlug || p.id === planSlug)
  if (!product) notFound()

  return (
    <EntitlementsTable
      productId={product.id}
      initialModuleIds={product.module_ids}
      modules={(modulesResult.data?.data ?? []).map((module) => ({
        id: module.id,
        key: module.key,
        name: module.name,
        description: module.description,
        featureSlug: module.feature_slug,
        status: module.status,
      }))}
    />
  )
}
