'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

import { Button } from '@876/ui/button'
import { Input } from '@876/ui/input'
import { Label } from '@876/ui/label'
import { NativeSelect, NativeSelectOption } from '@876/ui/native-select'
import { Textarea } from '@876/ui/textarea'

import { client } from '@/lib/client'
import type { BankAccountType } from '@/types/banking'

const ACCOUNT_TYPES: Array<{ value: BankAccountType; label: string }> = [
  { value: 'CHECKING', label: 'Checking' },
  { value: 'SAVINGS', label: 'Savings' },
  { value: 'CREDIT_CARD', label: 'Credit card' },
  { value: 'CASH', label: 'Cash' },
  { value: 'PAYPAL', label: 'PayPal' },
  { value: 'UNDEPOSITED_FUNDS', label: 'Undeposited funds' },
  { value: 'PETTY_CASH', label: 'Petty cash' },
]

interface InitialAccount {
  id: string
  name: string
  accountType: BankAccountType
  currency: string
  description: string | null
  isActive: boolean
}

export function BankAccountForm({
  currencies,
  initial,
}: {
  currencies: Array<{ value: string; label: string }>
  initial?: InitialAccount
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [name, setName] = useState(initial?.name ?? '')
  const [accountType, setAccountType] = useState<BankAccountType>(
    initial?.accountType ?? 'CHECKING'
  )
  const [currency, setCurrency] = useState(
    initial?.currency ?? currencies[0]?.value ?? ''
  )
  const [description, setDescription] = useState(initial?.description ?? '')
  const [isActive, setIsActive] = useState(initial?.isActive ?? true)

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!name.trim() || !currency) {
      setError('Enter an account name and currency.')
      return
    }

    setError(null)
    startTransition(async () => {
      const result = initial
        ? await client.bankAccounts.update(initial.id, {
            name,
            accountType,
            currency,
            description: description.trim() || null,
            isActive,
          })
        : await client.bankAccounts.create({
            name,
            accountType,
            currency,
            description: description.trim() || null,
          })
      if (result.error || !result.data) {
        setError(result.error?.message ?? 'Failed to save the bank account.')
        return
      }

      router.push(initial ? `/banking/${initial.id}` : '/banking')
      router.refresh()
    })
  }

  function remove() {
    if (!initial || !window.confirm('Delete this unused bank account?')) return

    setError(null)
    startTransition(async () => {
      const result = await client.bankAccounts.delete(initial.id)
      if (result.error) {
        setError(result.error.message)
        return
      }
      router.push('/banking')
      router.refresh()
    })
  }

  return (
    <form onSubmit={submit} className="max-w-2xl space-y-6">
      <div className="876-card grid gap-5 p-5 sm:grid-cols-2">
        <Field label="Account name" htmlFor="bank-account-name">
          <Input
            id="bank-account-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Operating account"
            required
          />
        </Field>
        <Field label="Account type" htmlFor="bank-account-type">
          <NativeSelect
            id="bank-account-type"
            value={accountType}
            onChange={(event) =>
              setAccountType(event.target.value as BankAccountType)
            }
          >
            {ACCOUNT_TYPES.map((type) => (
              <NativeSelectOption key={type.value} value={type.value}>
                {type.label}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Currency" htmlFor="bank-account-currency">
          <NativeSelect
            id="bank-account-currency"
            value={currency}
            onChange={(event) => setCurrency(event.target.value)}
          >
            {currencies.map((option) => (
              <NativeSelectOption key={option.value} value={option.value}>
                {option.label}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>
        {initial ? (
          <label className="border-border flex items-center gap-3 rounded-lg border px-4 py-3 sm:self-end">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(event) => setIsActive(event.target.checked)}
              className="size-4"
            />
            <span className="text-sm font-medium">Active account</span>
          </label>
        ) : null}
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="bank-account-description">Description</Label>
          <Textarea
            id="bank-account-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={3}
            placeholder="How this account is used"
          />
        </div>
      </div>

      {error ? <p className="text-destructive text-sm">{error}</p> : null}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Saving...' : initial ? 'Save' : 'Create'}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={isPending}
          onClick={() => router.back()}
        >
          Cancel
        </Button>
        {initial ? (
          <Button
            type="button"
            variant="destructive"
            disabled={isPending}
            onClick={remove}
            className="sm:ml-auto"
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
