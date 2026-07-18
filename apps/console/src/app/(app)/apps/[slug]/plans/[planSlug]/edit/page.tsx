import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { resolveApp, resolveProduct } from '../../../_data'
import { EditPlanForm } from './edit-plan-form'

type Props = { params: Promise<{ slug: string; planSlug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, planSlug } = await params
  const app = await resolveApp(slug)
  if (!app) return { title: 'Edit Plan' }
  const product = await resolveProduct(app.id, planSlug)
  return { title: `${product?.name ?? 'Edit Plan'} • ${app.name} - Apps` }
}

export default async function EditPlanPage({ params }: Props) {
  const { slug, planSlug } = await params
  const app = await resolveApp(slug)
  if (!app) notFound()
  const product = await resolveProduct(app.id, planSlug)
  if (!product) notFound()

  return (
    <div className="space-y-5">
      <div>
        <h1 className="876-page-title">Edit {product.name}</h1>
      </div>

      <EditPlanForm product={product} appSlug={app.slug} />
    </div>
  )
}
