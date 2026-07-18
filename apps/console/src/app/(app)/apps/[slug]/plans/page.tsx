import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { $876 } from '@/lib/876'
import { resolveApp } from '../_data'
import { PlansTable } from './plans-table'

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const app = await resolveApp(slug)
  if (!app) return { title: 'Plans' }
  return { title: `${app.name} • Plans - Apps` }
}

export default async function AppPlansPage({ params }: Props) {
  const { slug } = await params
  const app = await resolveApp(slug)
  if (!app || app.app_kind !== 'product') notFound()

  const { data } = await $876.products.list({ appId: app.id })
  const products = data?.data ?? []

  return (
    <div className="space-y-5">
      <div className="mb-2">
        <h2 className="text-lg font-medium tracking-tight">Plans</h2>
      </div>

      <PlansTable data={products} appId={app.id} appSlug={app.slug} />
    </div>
  )
}
