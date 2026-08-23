import { notFound } from 'next/navigation'
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
    <div className="space-y-5">
      <h1 className="text-xl font-semibold">Edit price</h1>
      <PriceForm productId={product.id} priceId={priceId} initial={price} />
    </div>
  )
}
