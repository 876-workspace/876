import { notFound, redirect } from 'next/navigation'

import { requirePagePermission } from '@/lib/auth/billing-context'
import { service } from '@/lib/service'
import { StockAdjustmentForm } from './_components/stock-adjustment-form'

export const metadata = { title: 'Adjust item stock' }

export default async function ItemStockPage({
  params,
}: {
  params: Promise<{ itemId: string }>
}) {
  const { itemId } = await params
  const context = await requirePagePermission('catalog:write')
  const item = await service.items.retrieve(context.tenant.id, itemId)
  if (!item) notFound()
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
