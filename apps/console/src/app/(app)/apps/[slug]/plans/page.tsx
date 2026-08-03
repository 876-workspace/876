import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import type { AdminApp } from '@876/admin'

import { $876 } from '@/lib/876'
import { resolveApp } from '../_data'
import { PlansTable } from './_components/plans-table'
import { Suspense } from 'react'
import { DataTableSkeleton } from '@876/ui/data-table-skeleton'
import { PLANS_SKELETON_COLUMNS } from './_components/plans-skeleton-columns'

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const app = await resolveApp(slug)
  if (!app) return { title: 'Plans' }
  return { title: `${app.name} • Plans - Apps` }
}

export default function AppPlansPage({ params }: Props) {
  return (
    <div className="space-y-5">
      <Suspense
        fallback={<DataTableSkeleton columns={PLANS_SKELETON_COLUMNS} />}
      >
        <AppPlansShell params={params} />
      </Suspense>
    </div>
  )
}

async function AppPlansShell({ params }: Props) {
  const { slug } = await params
  const app = await resolveApp(slug)
  if (!app || app.app_kind !== 'product') notFound()

  return (
    <>
      <div className="mb-2">
        <h2 className="text-lg font-medium tracking-tight">Plans</h2>
      </div>
      <Suspense
        fallback={<DataTableSkeleton columns={PLANS_SKELETON_COLUMNS} />}
      >
        <PlansTableData app={app} />
      </Suspense>
    </>
  )
}

async function PlansTableData({ app }: { app: AdminApp }) {
  const { data } = await $876.products.list({ appId: app.id })
  const products = data?.data ?? []

  return <PlansTable data={products} appId={app.id} appSlug={app.slug} />
}
