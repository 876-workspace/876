'use client'

import {
  RecurringInvoiceForm,
  type RecurringInvoiceFormProps,
} from '@876/billing-ui/recurring-invoice-form'

import { client } from '@/lib/client'

type Props = Omit<RecurringInvoiceFormProps, 'onSubmit' | 'mode'>

export function InvoiceRecurringInvoiceCreateForm(props: Props) {
  return (
    <RecurringInvoiceForm
      mode="create"
      {...props}
      onSubmit={async (params) => {
        const result = await client.recurringInvoices.create(params)
        return {
          id: result.data?.id ?? null,
          error: result.error?.message ?? null,
        }
      }}
    />
  )
}
