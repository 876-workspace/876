import { notFound } from 'next/navigation'
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
    <div className="space-y-5">
      <h1 className="text-xl font-semibold">Add price</h1>
      <PriceForm productId={product.id} initial={null} />
    </div>
  )
}
