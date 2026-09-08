'use client'

import { useState, useTransition } from 'react'

import { Button } from '@876/ui/button'
import { Input } from '@876/ui/input'
import { Label } from '@876/ui/label'
import { NativeSelect, NativeSelectOption } from '@876/ui/native-select'
import { Textarea } from '@876/ui/textarea'

export interface RefundFormOption {
  value: string
  label: string
}

export interface RefundFormAccountOption extends RefundFormOption {
  currency: string
}

export interface RefundFormSubmitParams {
  amount: string
  paymentModeId: string
  depositAccountId: string
  reason: string | null
  notes: string | null
  refundedAt: number
}

export interface RefundFormActionResult {
  error: string | null
}

export interface RefundFormProps {
  currency: string
  decimalPlaces: number
  availableAmount: string
  modes: RefundFormOption[]
  accounts: RefundFormAccountOption[]
  defaultModeId?: string
  defaultAccountId?: string
  sourceLabel: string
  onSubmit: (
    params: RefundFormSubmitParams
  ) => Promise<RefundFormActionResult>
  onCancel: () => void
}

/** Shared manual/offline refund editor used by Billing and Invoice hosts. */
export function RefundForm({
  currency,
  decimalPlaces,
  availableAmount,
  modes,
  accounts,
  defaultModeId,
  defaultAccountId,
  sourceLabel,
  onSubmit,
  onCancel,
}: RefundFormProps) {
  const [isPending, startTransition] = useTransition()
  const [now] = useState(Date.now)
  const [error, setError] = useState<string | null>(null)
  const [amount, setAmount] = useState(() =>
    formatMinorAmountInput(availableAmount, decimalPlaces)
  )
  const [paymentModeId, setPaymentModeId] = useState(
    defaultModeId ?? modes[0]?.value ?? ''
  )
  const [depositAccountId, setDepositAccountId] = useState(
    defaultAccountId ?? ''
  )
  const [refundedAt, setRefundedAt] = useState(
    unixTimestampToDateInput(now / 1000)
  )
  const [reason, setReason] = useState('')
  const [notes, setNotes] = useState('')

  const availableAccounts = accounts.filter(
    (account) => account.currency === currency
  )

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const refundAmount = parseMinorAmountInput(amount, decimalPlaces)
    if (!refundAmount) {
      setError('Enter a valid refund amount greater than zero.')
      return
    }
    if (BigInt(refundAmount) > BigInt(availableAmount)) {
      setError('Refund amount cannot exceed the available customer credit.')
      return
    }
    if (!paymentModeId || !depositAccountId) {
      setError('Select the refund method and funding account.')
      return
    }

    const timestamp = Math.floor(Date.parse(`${refundedAt}T00:00:00Z`) / 1000)
    if (!Number.isInteger(timestamp)) {
      setError('Enter a valid refund date.')
      return
    }

    setError(null)
    startTransition(async () => {
      const result = await onSubmit({
        amount: refundAmount,
        paymentModeId,
        depositAccountId,
        reason: reason.trim() || null,
        notes: notes.trim() || null,
        refundedAt: timestamp,
      })
      if (result.error) setError(result.error)
    })
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <div className="876-card grid gap-5 p-5 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <p className="876-eyebrow">Refund source</p>
          <p className="font-medium">{sourceLabel}</p>
          <p className="text-muted-foreground text-sm">
            Available to refund: {formatMinorAmountInput(availableAmount, decimalPlaces)}{' '}
            {currency}
          </p>
        </div>

        <Field label="Amount" htmlFor="refund-amount">
          <Input
            id="refund-amount"
            type="number"
            min={minorAmountInputStep(decimalPlaces)}
            max={formatMinorAmountInput(availableAmount, decimalPlaces)}
            step={minorAmountInputStep(decimalPlaces)}
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            required
          />
        </Field>

        <Field label="Refund date" htmlFor="refund-date">
          <Input
            id="refund-date"
            type="date"
            value={refundedAt}
            onChange={(event) => setRefundedAt(event.target.value)}
            required
          />
        </Field>

        <Field label="Refund method" htmlFor="refund-mode">
          <NativeSelect
            id="refund-mode"
            value={paymentModeId}
            onChange={(event) => setPaymentModeId(event.target.value)}
            required
          >
            <NativeSelectOption value="">Select...</NativeSelectOption>
            {modes.map((mode) => (
              <NativeSelectOption key={mode.value} value={mode.value}>
                {mode.label}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>

        <Field label="Refund from" htmlFor="refund-account">
          <NativeSelect
            id="refund-account"
            value={depositAccountId}
            onChange={(event) => setDepositAccountId(event.target.value)}
            required
          >
            <NativeSelectOption value="">Select...</NativeSelectOption>
            {availableAccounts.map((account) => (
              <NativeSelectOption key={account.value} value={account.value}>
                {account.label}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>

        <Field label="Reason" htmlFor="refund-reason">
          <Input
            id="refund-reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Customer request, duplicate payment..."
          />
        </Field>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="refund-notes">Notes</Label>
          <Textarea
            id="refund-notes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            rows={3}
          />
        </div>
      </div>

      {error ? <p className="text-destructive text-sm">{error}</p> : null}

      <div className="flex gap-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Recording refund...' : 'Record refund'}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} disabled={isPending}>
          Cancel
        </Button>
      </div>
    </form>
  )
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string
  htmlFor: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  )
}

function minorAmountInputStep(decimalPlaces: number): string {
  return decimalPlaces === 0 ? '1' : `0.${'0'.repeat(decimalPlaces - 1)}1`
}

function formatMinorAmountInput(
  amount: bigint | string,
  decimalPlaces: number
): string {
  const value = typeof amount === 'bigint' ? amount : BigInt(amount)
  if (decimalPlaces === 0) return value.toString()
  const scale = 10n ** BigInt(decimalPlaces)
  const whole = value / scale
  const fraction = (value % scale).toString().padStart(decimalPlaces, '0')
  return `${whole}.${fraction}`
}

function parseMinorAmountInput(
  value: string,
  decimalPlaces: number
): string | null {
  const normalized = value.trim()
  const pattern =
    decimalPlaces === 0
      ? /^\d+$/
      : new RegExp(`^\\d+(?:\\.\\d{1,${decimalPlaces}})?$`)
  if (!pattern.test(normalized)) return null

  const [whole, fraction = ''] = normalized.split('.')
  const scale = 10n ** BigInt(decimalPlaces)
  const amount =
    BigInt(whole) * scale + BigInt(fraction.padEnd(decimalPlaces, '0') || '0')
  return amount > 0n ? amount.toString() : null
}

function unixTimestampToDateInput(timestamp: number): string {
  return new Date(Math.floor(timestamp) * 1000).toISOString().slice(0, 10)
}
