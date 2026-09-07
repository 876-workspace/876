import { notFound, redirect } from 'next/navigation'

import { getInvoice } from '@/lib/invoice'
import { StockAdjustmentForm } from './_components/stock-adjustment-form'

export const metadata = { title: 'Adjust item stock' }

export default async function ItemStockPage({
  params,
}: {
  params: Promise<{ itemId: string }>
}) {
  const { itemId } = await params
  const invoice = await getInvoice()
  if (!invoice) redirect('/no-access')
  if (invoice.role === 'staff') redirect(`/items/${itemId}`)

  const result = await invoice.items.retrieve(itemId)
  if (result.error) {
    if (result.error.code.endsWith('/not-found')) notFound()
    redirect(`/items/${itemId}`)
  }

  const item = result.data
  if (item.type !== 'GOOD' || !item.trackStock)
    redirect(`/items/${item.id}`)

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-base font-semibold">Adjust stock</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Update the current count for {item.name}. The change is recorded in
          the stock audit trail.
        </p>
      </div>
      <StockAdjustmentForm
        itemId={item.id}
        currentQuantity={item.stockQuantity ?? 0}
        allowOutOfStock={item.allowOutOfStock}
      />
    </div>
  )
}
