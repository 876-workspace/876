'use client'

import {
  RecurringInvoiceForm,
  type RecurringInvoiceFormCurrencyOption,
  type RecurringInvoiceFormInitial,
  type RecurringInvoiceFormItemOption,
  type RecurringInvoiceFormOption,
} from '@876/billing-ui/recurring-invoice-form'

import { client } from '@/lib/client'

export function BillingRecurringInvoiceEditForm({
  recurringInvoiceId,
  initial,
  customers,
  paymentTerms,
  currencies,
  items,
  defaultCurrency,
}: {
  recurringInvoiceId: string
  initial: RecurringInvoiceFormInitial
  customers: RecurringInvoiceFormOption[]
  paymentTerms?: RecurringInvoiceFormOption[]
  currencies: RecurringInvoiceFormCurrencyOption[]
  items: RecurringInvoiceFormItemOption[]
  defaultCurrency: string
}) {
  return (
    <RecurringInvoiceForm
      mode="edit"
      initial={initial}
      customers={customers}
      paymentTerms={paymentTerms}
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
