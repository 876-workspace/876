'use client'

import {
  SalesReceiptCreateForm,
  type SalesReceiptCreateFormProps,
} from '@876/billing-ui/sales-receipt-create-form'

import { client } from '@/lib/client'

type Props = Omit<SalesReceiptCreateFormProps, 'onCreate'>

export function BillingSalesReceiptCreateForm(props: Props) {
  return (
    <SalesReceiptCreateForm
      {...props}
      onCreate={async (params) => {
        const result = await client.salesReceipts.create(params)
        return {
          id: result.data?.id ?? null,
          error: result.error?.message ?? null,
        }
      }}
    />
  )
}
