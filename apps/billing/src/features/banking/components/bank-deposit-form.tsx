'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@876/ui/button'
import { FormRow } from '@876/ui/form-row'
import { NativeSelect, NativeSelectOption } from '@876/ui/native-select'
import { client } from '@/lib/client'

type Transaction = { id: string; amount: string; description: string | null }
type Account = { id: string; name: string }

export function BankDepositForm({
  sourceAccountId,
  currency,
  transactions,
  destinations,
}: {
  sourceAccountId: string
  currency: string
  transactions: Transaction[]
  destinations: Account[]
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [destinationAccountId, setDestination] = useState(
    destinations[0]?.id ?? ''
  )
  const [selected, setSelected] = useState<string[]>([])
  const amount = selected.reduce(
    (sum, id) =>
      sum +
      BigInt(
        transactions.find((transaction) => transaction.id === id)?.amount ?? '0'
      ),
    0n
  )
  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!destinationAccountId || !selected.length) {
      setError('Choose a destination and at least one incoming transaction.')
      return
    }
    startTransition(async () => {
      const result = await client.bankDeposits.create({
        sourceAccountId,
        destinationAccountId,
        transactionIds: selected,
        amount: amount.toString(),
        currency,
        depositedAt: Math.floor(Date.now() / 1000),
      })
      if (result.error) {
        setError(result.error.message)
        return
      }
      router.push(`/banking/${sourceAccountId}`)
      router.refresh()
    })
  }
  return (
    <form onSubmit={submit} className="876-card max-w-2xl space-y-5 p-5">
      <FormRow label="Deposit to" htmlFor="destination">
        <NativeSelect
          id="destination"
          value={destinationAccountId}
          onChange={(event) => setDestination(event.target.value)}
        >
          <NativeSelectOption value="">
            Choose checking or savings account
          </NativeSelectOption>
          {destinations.map((account) => (
            <NativeSelectOption key={account.id} value={account.id}>
              {account.name}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </FormRow>
      <FormRow label="Incoming payments">
        <p className="text-muted-foreground mb-2 text-sm">
          Select booked incoming cash to include in this physical deposit.
        </p>
        <div className="space-y-2">
          {transactions.map((transaction) => (
            <label key={transaction.id} className="flex gap-3 text-sm">
              <input
                type="checkbox"
                checked={selected.includes(transaction.id)}
                onChange={(event) =>
                  setSelected(
                    event.target.checked
                      ? [...selected, transaction.id]
                      : selected.filter((id) => id !== transaction.id)
                  )
                }
              />
              {transaction.description ?? 'Incoming payment'} ·{' '}
              {transaction.amount} minor units
            </label>
          ))}
        </div>
      </FormRow>
      <p className="text-sm font-medium">
        Total: {amount.toString()} {currency} minor units
      </p>
      {error ? <p className="text-destructive text-sm">{error}</p> : null}
      <Button type="submit" variant="info" disabled={pending}>
        {pending ? 'Recording…' : 'Record deposit'}
      </Button>
    </form>
  )
}
