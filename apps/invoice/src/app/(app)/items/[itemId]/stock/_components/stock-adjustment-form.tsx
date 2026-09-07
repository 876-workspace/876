'use client'

import { useRouter } from 'next/navigation'
import { ItemStockAdjustmentForm as SharedStockAdjustmentForm } from '@876/billing-ui/item-stock-adjustment-form'

import { client } from '@/lib/client'

export function StockAdjustmentForm({
  itemId,
  currentQuantity,
  allowOutOfStock,
}: {
  itemId: string
  currentQuantity: number
  allowOutOfStock: boolean
}) {
  const router = useRouter()
  const returnToItem = () => router.push(`/items/${itemId}`)

  return (
    <SharedStockAdjustmentForm
      currentQuantity={currentQuantity}
      allowOutOfStock={allowOutOfStock}
      onAdjust={(params) =>
        client.items.adjustStock(itemId, params.quantity, params.note)
      }
      onCancel={returnToItem}
      onSaved={() => {
        returnToItem()
        router.refresh()
      }}
    />
  )
}
