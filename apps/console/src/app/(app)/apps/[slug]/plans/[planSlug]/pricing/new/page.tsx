import { notFound } from 'next/navigation'
import { PageBreadcrumb } from '@876/ui/page'

import { resolveApp, resolveProduct } from '../../../../_data'
import { PriceForm } from '../_components/price-form'
export default async function NewPricePage({
  params,
}: {
  params: Promise<{ slug: string; planSlug: string }>
}) {
  const { slug, planSlug } = await params
  const app = await resolveApp(slug)
  if (!app) notFound()
  const product = await resolveProduct(app.id, planSlug)
  if (!product) notFound()
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <PageBreadcrumb
          href={`/apps/${slug}/plans/${planSlug}/pricing`}
          label="Pricing"
          className="mb-2 -ml-2.5"
        />
        <h1 className="876-page-title">Add price</h1>
      </div>
      <PriceForm productId={product.id} initial={null} />
    </div>
  )
}
