'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

import { Button } from '@876/ui/button'
import { Input } from '@876/ui/input'
import { Label } from '@876/ui/label'
import { NativeSelect, NativeSelectOption } from '@876/ui/native-select'
import { Textarea } from '@876/ui/textarea'

import { client } from '@/lib/client'
import {
  formatMinorAmountInput,
  minorAmountInputStep,
  parseMinorAmountInput,
  unixTimestampToDateInput,
} from '@/lib/format'
import type {
  BankTransactionStatus,
  BankTransactionType,
} from '@/types/banking'

interface InitialTransaction {
  id: string
  type: BankTransactionType
  amount: string
  date: number
  description: string | null
  status: BankTransactionStatus
  reference: string | null
}

export function BankTransactionForm({
  accountId,
  currency,
  decimalPlaces,
  initial,
}: {
  accountId: string
  currency: string
  decimalPlaces: number
  initial?: InitialTransaction
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [now] = useState(Date.now)
  const [error, setError] = useState<string | null>(null)
  const [type, setType] = useState<BankTransactionType>(
    initial?.type ?? 'CREDIT'
  )
  const [amount, setAmount] = useState(
    initial ? formatMinorAmountInput(initial.amount, decimalPlaces) : ''
  )
  const [date, setDate] = useState(
    initial
      ? unixTimestampToDateInput(initial.date)
      : unixTimestampToDateInput(now / 1000)
  )
  const [description, setDescription] = useState(initial?.description ?? '')
  const [reference, setReference] = useState(initial?.reference ?? '')
  const [status, setStatus] = useState<
    Exclude<BankTransactionStatus, 'MATCHED'>
  >(
    initial?.status === 'MATCHED'
      ? 'CATEGORIZED'
      : (initial?.status ?? 'UNCATEGORIZED')
  )

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const minorAmount = parseMinorAmountInput(amount, decimalPlaces)
    const transactionDate = Math.floor(Date.parse(`${date}T00:00:00Z`) / 1000)
    if (!minorAmount || !Number.isInteger(transactionDate)) {
      setError('Enter a valid amount and date.')
      return
    }

    setError(null)
    startTransition(async () => {
      const params = {
        type,
        amount: minorAmount,
        date: transactionDate,
        description: description.trim() || null,
        reference: reference.trim() || null,
      }
      const result = initial
        ? await client.bankTransactions.update(accountId, initial.id, {
            ...params,
            status,
          })
        : await client.bankTransactions.create(accountId, params)
      if (result.error) {
        setError(result.error.message)
        return
      }
      router.push(`/banking/${accountId}`)
      router.refresh()
    })
  }

  function remove() {
    if (!initial || !window.confirm('Delete this bank transaction?')) return

    startTransition(async () => {
      const result = await client.bankTransactions.delete(accountId, initial.id)
      if (result.error) {
        setError(result.error.message)
        return
      }
      router.push(`/banking/${accountId}`)
      router.refresh()
    })
  }

  return (
    <form onSubmit={submit} className="max-w-2xl space-y-6">
      <div className="876-card grid gap-5 p-5 sm:grid-cols-2">
        <Field label="Type" htmlFor="bank-transaction-type">
          <NativeSelect
            id="bank-transaction-type"
            value={type}
            onChange={(event) =>
              setType(event.target.value as BankTransactionType)
            }
          >
            <NativeSelectOption value="CREDIT">Money in</NativeSelectOption>
            <NativeSelectOption value="DEBIT">Money out</NativeSelectOption>
          </NativeSelect>
        </Field>
        <Field label={`Amount (${currency})`} htmlFor="bank-transaction-amount">
          <Input
            id="bank-transaction-amount"
            type="number"
            min={minorAmountInputStep(decimalPlaces)}
            step={minorAmountInputStep(decimalPlaces)}
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            required
          />
        </Field>
        <Field label="Date" htmlFor="bank-transaction-date">
          <Input
            id="bank-transaction-date"
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            required
          />
        </Field>
        {initial ? (
          <Field label="Reconciliation" htmlFor="bank-transaction-status">
            <NativeSelect
              id="bank-transaction-status"
              value={status}
              onChange={(event) =>
                setStatus(
                  event.target.value as Exclude<
                    BankTransactionStatus,
                    'MATCHED'
                  >
                )
              }
            >
              <NativeSelectOption value="UNCATEGORIZED">
                Uncategorized
              </NativeSelectOption>
              <NativeSelectOption value="CATEGORIZED">
                Categorized
              </NativeSelectOption>
              <NativeSelectOption value="EXCLUDED">Excluded</NativeSelectOption>
            </NativeSelect>
          </Field>
        ) : null}
        <Field label="Reference" htmlFor="bank-transaction-reference">
          <Input
            id="bank-transaction-reference"
            value={reference}
            onChange={(event) => setReference(event.target.value)}
          />
        </Field>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="bank-transaction-description">Description</Label>
          <Textarea
            id="bank-transaction-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={3}
          />
        </div>
      </div>
      {error ? <p className="text-destructive text-sm">{error}</p> : null}
      <div className="flex gap-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Saving...' : initial ? 'Save' : 'Create'}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        {initial ? (
          <Button
            type="button"
            variant="destructive"
            disabled={isPending}
            onClick={remove}
            className="ml-auto"
          >
            Delete
          </Button>
        ) : null}
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
