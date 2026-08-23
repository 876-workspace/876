import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { PageBreadcrumb } from '@876/ui/page'

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

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <PageBreadcrumb
          href={`/apps/${slug}/plans/${planSlug}`}
          label={product.name}
          className="mb-2 -ml-2.5"
        />
        <h1 className="876-page-title">
          Edit <span className="text-muted-foreground">{product.name}</span>
        </h1>
      </div>

      <EditPlanForm product={product} appSlug={app.slug} />
    </div>
  )
}
