'use client'

import { useRouter } from 'next/navigation'
import {
  RefundForm,
  type RefundFormAccountOption,
  type RefundFormOption,
  type RefundFormSubmitParams,
} from '@876/billing-ui/refund-form'

import { client } from '@/lib/client'

export function InvoiceSalesReceiptRefundForm({
  salesReceiptId,
  number,
  currency,
  decimalPlaces,
  availableAmount,
  modes,
  accounts,
}: {
  salesReceiptId: string
  number: string
  currency: string
  decimalPlaces: number
  availableAmount: string
  modes: RefundFormOption[]
  accounts: RefundFormAccountOption[]
}) {
  const router = useRouter()
  const returnHref = `/sales-receipts/${salesReceiptId}`

  async function save(params: RefundFormSubmitParams) {
    const result = await client.salesReceipts.refund(salesReceiptId, {
      amount: params.amount,
      paymentModeId: params.paymentModeId,
      depositAccountId: params.depositAccountId,
      reason: params.reason,
      notes: params.notes,
      refundedAt: params.refundedAt,
      returnLines: [],
    })
    if (result.error) return { error: result.error.message }

    router.push(returnHref)
    router.refresh()
    return { error: null }
  }

  return (
    <RefundForm
      currency={currency}
      decimalPlaces={decimalPlaces}
      availableAmount={availableAmount}
      modes={modes}
      accounts={accounts}
      sourceLabel={`${number} · immediate paid sale`}
      onSubmit={save}
      onCancel={() => router.push(returnHref)}
    />
  )
}
