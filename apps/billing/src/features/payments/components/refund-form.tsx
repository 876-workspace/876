'use client'

import { useRouter } from 'next/navigation'

import {
  RefundForm as SharedRefundForm,
  type RefundFormAccountOption,
  type RefundFormOption,
  type RefundFormSubmitParams,
} from '@876/billing-ui/refund-form'

import { client } from '@/lib/client'

export function RefundForm({
  customerId,
  currency,
  decimalPlaces,
  availableAmount,
  modes,
  accounts,
  defaultModeId,
  defaultAccountId,
  paymentId,
  creditNoteId,
  sourceLabel,
  returnHref,
}: {
  customerId: string
  currency: string
  decimalPlaces: number
  availableAmount: string
  modes: RefundFormOption[]
  accounts: RefundFormAccountOption[]
  defaultModeId?: string
  defaultAccountId?: string
  paymentId?: string
  creditNoteId?: string
  sourceLabel: string
  returnHref: string
}) {
  const router = useRouter()

  async function save(params: RefundFormSubmitParams) {
    const result = await client.refunds.create({
      customerId,
      currency,
      ...params,
      paymentId,
      creditNoteId,
    })
    if (result.error) return { error: result.error.message }

    router.push(returnHref)
    router.refresh()
    return { error: null }
  }

  return (
    <SharedRefundForm
      currency={currency}
      decimalPlaces={decimalPlaces}
      availableAmount={availableAmount}
      modes={modes}
      accounts={accounts}
      defaultModeId={defaultModeId}
      defaultAccountId={defaultAccountId}
      sourceLabel={sourceLabel}
      onSubmit={save}
      onCancel={() => router.push(returnHref)}
    />
  )
}
