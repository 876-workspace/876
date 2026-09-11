'use client'

import {
  RecurringInvoiceForm,
  type RecurringInvoiceFormCurrencyOption,
  type RecurringInvoiceFormInitial,
  type RecurringInvoiceFormItemOption,
  type RecurringInvoiceFormOption,
} from '@876/billing-ui/recurring-invoice-form'

import { client } from '@/lib/client'

export function InvoiceRecurringInvoiceEditForm({
  recurringInvoiceId,
  initial,
  customers,
  currencies,
  items,
  defaultCurrency,
}: {
  recurringInvoiceId: string
  initial: RecurringInvoiceFormInitial
  customers: RecurringInvoiceFormOption[]
  currencies: RecurringInvoiceFormCurrencyOption[]
  items: RecurringInvoiceFormItemOption[]
  defaultCurrency: string
}) {
  return (
    <RecurringInvoiceForm
      mode="edit"
      initial={initial}
      customers={customers}
      currencies={currencies}
      items={items}
      defaultCurrency={defaultCurrency}
      onSubmit={async (params) => {
        const result = await client.recurringInvoices.update(
          recurringInvoiceId,
          params
        )
        return {
          id: result.data?.id ?? null,
          error: result.error?.message ?? null,
        }
      }}
    />
  )
}
