'use client'

import { useRouter } from 'next/navigation'

import {
  PaymentReceivedForm,
  type PaymentReceivedAccountOption,
  type PaymentReceivedCurrencyOption,
  type PaymentReceivedInvoiceOption,
  type PaymentReceivedOption,
  type PaymentReceivedPrefill,
  type PaymentReceivedSubmitParams,
} from '@876/billing-ui/payment-received-form'

import { client } from '@/lib/client'

export function InvoicePaymentReceivedForm({
  customers,
  accounts,
  modes,
  currencies,
  invoices,
  defaultCurrency,
  prefill,
}: {
  customers: PaymentReceivedOption[]
  accounts: PaymentReceivedAccountOption[]
  modes: PaymentReceivedOption[]
  currencies: PaymentReceivedCurrencyOption[]
  invoices: PaymentReceivedInvoiceOption[]
  defaultCurrency: string
  prefill?: PaymentReceivedPrefill
}) {
  const router = useRouter()

  async function save(params: PaymentReceivedSubmitParams) {
    const result = await client.payments.create(params)
    if (result.error || !result.data) {
      return {
        error: result.error?.message ?? 'Failed to record the payment received.',
      }
    }

    router.push(`/payments/${result.data.id}`)
    router.refresh()
    return { error: null }
  }

  return (
    <PaymentReceivedForm
      customers={customers}
      accounts={accounts}
      modes={modes}
      currencies={currencies}
      invoices={invoices}
      defaultCurrency={defaultCurrency}
      prefill={prefill}
      onSubmit={save}
      onCancel={() => router.back()}
    />
  )
}
