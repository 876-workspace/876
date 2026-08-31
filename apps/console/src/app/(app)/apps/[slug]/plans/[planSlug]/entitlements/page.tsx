import { workspace } from '@/lib/services/workspace'
import { Suspense } from 'react'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { Button } from '@876/ui/button'
import {
  StatusFilterHeading,
  type StatusFilterOption,
} from '@876/ui/status-filter-heading'

import { resolveApp, resolveProduct } from '../../../_data'
import { EntitlementsTable } from './_components/entitlements-table'

type Props = {
  params: Promise<{ slug: string; planSlug: string }>
  searchParams: Promise<{ status?: string }>
}

const MODULE_STATUS_OPTIONS: StatusFilterOption[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'archived', label: 'Archived' },
]

function isModuleStatus(status: string | undefined): boolean {
  return status === 'active' || status === 'archived'
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, planSlug } = await params
  const app = await resolveApp(slug)
  if (!app) return { title: 'Plan Entitlements not found' }

  const product = await resolveProduct(app.id, planSlug)

  if (!product) return { title: 'Plan not found' }
  return { title: `${product.name} Entitlements • ${app.name}` }
}

export default async function PlanEntitlementsPage({
  params,
  searchParams,
}: Props) {
  const { status } = await searchParams

  // Unknown or missing status resolves to all — never an API error.
  const moduleStatus = isModuleStatus(status) ? status : undefined

  // The heading and its filter read only searchParams, so the fallback
  // renders them for real — nothing about the header shimmers.
  return (
    <Suspense fallback={<PickerFallback status={moduleStatus ?? 'all'} />}>
      <PlanEntitlementsData params={params} status={moduleStatus} />
    </Suspense>
  )
}

async function PlanEntitlementsData({
  params,
  status,
}: {
  params: Props['params']
  status?: string
}) {
  const { slug, planSlug } = await params
  const app = await resolveApp(slug)

  if (!app || app.app_kind !== 'product') notFound()

  const [product, modulesResult] = await Promise.all([
    resolveProduct(app.id, planSlug),
    workspace.modules.list(app.id, { includeArchived: true }),
  ])
  if (!product) notFound()

  // The filter narrows the view only. Selection is seeded from the full
  // module_ids list, so a module hidden by the filter keeps its checked
  // state — saving never silently drops it.
  const modules = (modulesResult.data?.data ?? [])
    .filter((module) => !status || module.status === status)
    .map((module) => ({
      id: module.id,
      key: module.key,
      name: module.name,
      description: module.description,
      featureSlug: module.feature_slug,
      status: module.status,
    }))

  return (
    <EntitlementsTable
      productId={product.id}
      initialModuleIds={product.module_ids}
      modules={modules}
      status={status ?? 'all'}
      statusOptions={MODULE_STATUS_OPTIONS}
    />
  )
}

function PickerFallback({ status }: { status: string }) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <StatusFilterHeading
          label="Entitlements"
          value={status}
          options={MODULE_STATUS_OPTIONS}
        />
        <Button size="sm" variant="outline" disabled>
          Save
        </Button>
      </div>
      <PickerSkeleton />
    </div>
  )
}

function PickerSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      {Array.from({ length: 4 }, (_, index) => (
        <div key={index} className="876-card h-[5.75rem] animate-pulse" />
      ))}
    </div>
  )
}
