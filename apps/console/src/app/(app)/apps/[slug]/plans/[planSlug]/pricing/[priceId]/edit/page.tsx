import { notFound } from 'next/navigation'
import { PageBreadcrumb } from '@876/ui/page'

import { resolveApp, resolveProduct } from '../../../../../_data'
import { PriceForm } from '../../_components/price-form'
export default async function EditPricePage({
  params,
}: {
  params: Promise<{ slug: string; planSlug: string; priceId: string }>
}) {
  const { slug, planSlug, priceId } = await params
  const app = await resolveApp(slug)
  if (!app) notFound()
  const product = await resolveProduct(app.id, planSlug)
  const price = product?.prices.find((candidate) => candidate.id === priceId)
  if (!price || !product) notFound()

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <PageBreadcrumb
          href={`/apps/${slug}/plans/${planSlug}/pricing`}
          label="Pricing"
          className="mb-2 -ml-2.5"
        />
        <h1 className="876-page-title">
          Edit{' '}
          <span className="text-muted-foreground">
            {price.name || price.nickname || priceId}
          </span>
        </h1>
      </div>
      <PriceForm productId={product.id} priceId={priceId} initial={price} />
    </div>
  )
}
