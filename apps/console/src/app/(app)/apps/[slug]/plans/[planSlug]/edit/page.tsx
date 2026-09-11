import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { resolveApp, resolveProduct } from '../../../_data'
import { EditPlanForm } from './_components/edit-plan-form'

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

  // Renders in the plan card's body beside the list; the card header already
  // names the plan and its close button is the way back.
  return <EditPlanForm product={product} appSlug={app.slug} />
}
