'use client'

import { useRouter } from 'next/navigation'
import { SalesReceiptLifecycleActions } from '@876/billing-ui/sales-receipt-lifecycle-actions'

import { client } from '@/lib/client'

export function InvoiceSalesReceiptLifecycleActions({
  salesReceiptId,
  canRefund,
  canVoid,
}: {
  salesReceiptId: string
  canRefund: boolean
  canVoid: boolean
}) {
  const router = useRouter()

  return (
    <SalesReceiptLifecycleActions
      refundHref={`/sales-receipts/${salesReceiptId}/refund`}
      canRefund={canRefund}
      canVoid={canVoid}
      onVoid={async () => {
        const result = await client.salesReceipts.void(salesReceiptId)
        if (result.error) return { error: result.error.message }
        router.refresh()
        return { error: null }
      }}
    />
  )
}
