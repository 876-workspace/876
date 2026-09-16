'use client'

import type { BillingMethod, ProjectBilling } from '@876/projects'
import { AppError, type AppErrorValue } from '@876/ui/app-error'
import { Button } from '@876/ui/button'
import { FormRow } from '@876/ui/form-row'
import { Input } from '@876/ui/input'
import { NativeSelect } from '@876/ui/native-select'
import { useRouter } from 'next/navigation'
import { useState, type FormEvent } from 'react'

import { financeClient } from '@/lib/client/finance'
import {
  formatMinorForInput,
  fractionDigitsForCurrency,
  parseDecimalToMinor,
} from '../money-input'

const METHODS: BillingMethod[] = [
  'non-billable',
  'fixed-fee',
  'time-and-materials',
  'hourly',
  'phase-based',
]

export function BillingForm({
  projectId,
  billing,
}: {
  projectId: string
  billing: ProjectBilling | null
}) {
  const router = useRouter()
  const [method, setMethod] = useState<BillingMethod>(
    billing?.billingMethod ?? 'non-billable'
  )
  const [currency, setCurrency] = useState(billing?.currency ?? 'USD')
  const [customerId, setCustomerId] = useState(billing?.billingCustomerId ?? '')
  const [fixedFee, setFixedFee] = useState(
    formatMinorForInput(
      billing?.fixedFeeAmount,
      fractionDigitsForCurrency(billing?.currency ?? 'USD')
    )
  )
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<AppErrorValue | null>(null)

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending) return

    const code = currency.trim().toUpperCase()
    if (!/^[A-Z]{3}$/.test(code)) {
      setError({
        code: 'projects/billing-invalid-currency',
        message: 'Enter a three-letter currency code.',
      })
      return
    }

    let fixedFeeAmount: number | null = null
    if (method === 'fixed-fee' && fixedFee.trim() !== '') {
      const parsed = parseDecimalToMinor(
        fixedFee,
        fractionDigitsForCurrency(code)
      )
      if (parsed === null) {
        setError({
          code: 'projects/billing-invalid-amount',
          message: 'Enter a valid fixed fee amount.',
        })
        return
      }
      fixedFeeAmount = parsed
    }

    setPending(true)
    setError(null)
    const result = await financeClient.putBilling(projectId, {
      billingMethod: method,
      currency: code,
      billingCustomerId: customerId.trim() === '' ? null : customerId.trim(),
      fixedFeeAmount,
    })
    setPending(false)

    if (result.error || !result.data) {
      setError(
        result.error ?? {
          code: 'projects/billing-save-failed',
          message: 'Billing settings could not be saved.',
        }
      )
      return
    }

    router.push(`/projects/${encodeURIComponent(result.data.projectId)}/finance`)
  }

  return (
    <form
      onSubmit={onSubmit}
      className="876-card max-w-3xl space-y-5 p-6"
      aria-label="Edit billing"
    >
      {error ? (
        <AppError title="Billing settings could not be saved" error={error} />
      ) : null}

      <FormRow label="Method" htmlFor="billing-method" required>
        <NativeSelect
          id="billing-method"
          value={method}
          onChange={(event) => setMethod(event.target.value as BillingMethod)}
          className="w-full"
        >
          {METHODS.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </NativeSelect>
      </FormRow>

      <FormRow label="Currency" htmlFor="billing-currency" required>
        <Input
          id="billing-currency"
          value={currency}
          onChange={(event) => setCurrency(event.target.value)}
          placeholder="USD"
          maxLength={3}
        />
      </FormRow>

      <FormRow label="Billing customer" htmlFor="billing-customer">
        <Input
          id="billing-customer"
          value={customerId}
          onChange={(event) => setCustomerId(event.target.value)}
          placeholder="Customer id"
        />
      </FormRow>

      {method === 'fixed-fee' ? (
        <FormRow label="Fixed fee" htmlFor="billing-fixed-fee">
          <Input
            id="billing-fixed-fee"
            value={fixedFee}
            onChange={(event) => setFixedFee(event.target.value)}
            placeholder="0.00"
            inputMode="decimal"
          />
        </FormRow>
      ) : null}

      <div className="flex justify-end gap-2 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={pending}
        >
          Cancel
        </Button>
        <Button type="submit" variant="info" disabled={pending}>
          {pending ? 'Saving…' : 'Save'}
        </Button>
      </div>
    </form>
  )
}
