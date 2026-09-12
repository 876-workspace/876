'use client'

import { useRouter } from 'next/navigation'

import {
  PaymentReceivedForm,
  type PaymentReceivedAccountOption,
  type PaymentReceivedCurrencyOption,
  type PaymentReceivedInitial,
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
  initial,
  prefill,
  canDelete = false,
  returnHref,
}: {
  customers: PaymentReceivedOption[]
  accounts: PaymentReceivedAccountOption[]
  modes: PaymentReceivedOption[]
  currencies: PaymentReceivedCurrencyOption[]
  invoices: PaymentReceivedInvoiceOption[]
  defaultCurrency: string
  initial?: PaymentReceivedInitial
  prefill?: PaymentReceivedPrefill
  canDelete?: boolean
  returnHref?: string
}) {
  const router = useRouter()

  async function save(params: PaymentReceivedSubmitParams) {
    const result = initial
      ? await client.payments.update(initial.id, params)
      : await client.payments.create(params)
    if (result.error || !result.data) {
      return {
        error: result.error?.message ?? 'Failed to save the payment received.',
      }
    }

    router.push(returnHref ?? `/payments/${initial?.id ?? result.data.id}`)
    router.refresh()
    return { error: null }
  }

  async function remove() {
    if (!initial) return { error: 'Payment not found.' }
    const result = await client.payments.delete(initial.id)
    if (result.error) return { error: result.error.message }
    router.push('/payments')
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
      initial={initial}
      prefill={prefill}
      onSubmit={save}
      onDelete={initial && canDelete ? remove : undefined}
      onCancel={() => (returnHref ? router.push(returnHref) : router.back())}
    />
  )
}
