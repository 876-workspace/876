'use client'

import { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

import { Button } from '@876/ui/button'
import { Input } from '@876/ui/input'
import { Label } from '@876/ui/label'
import { NativeSelect, NativeSelectOption } from '@876/ui/native-select'
import { Textarea } from '@876/ui/textarea'

import { client } from '@/lib/client'
import type {
  BankDirectoryBank,
  BankDirectoryBranch,
} from '@/lib/client/bank-directory'
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

const BANK_LINKED = new Set<BankAccountType>([
  'CHECKING',
  'SAVINGS',
  'CREDIT_CARD',
])
const BRANCH_REQUIRED = new Set<BankAccountType>(['CHECKING', 'SAVINGS'])

interface InitialAccount {
  id: string
  name: string
  accountType: BankAccountType
  currency: string
  description: string | null
  directoryBankId?: string | null
  directoryBranchId?: string | null
  institutionName?: string | null
  accountHolderName?: string | null
  accountNumberLast4?: string | null
  isActive: boolean
}

export function BankAccountForm({
  currencies,
  initial,
  initialBanks = [],
  initialBranches = [],
  initialDirectoryError = null,
  countryCode = 'JM',
}: {
  currencies: Array<{ value: string; label: string }>
  initial?: InitialAccount
  initialBanks?: BankDirectoryBank[]
  initialBranches?: BankDirectoryBranch[]
  initialDirectoryError?: string | null
  countryCode?: string
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [directoryError, setDirectoryError] = useState<string | null>(
    initialDirectoryError
  )
  const [name, setName] = useState(initial?.name ?? '')
  const [accountType, setAccountType] = useState<BankAccountType>(
    initial?.accountType ?? 'CHECKING'
  )
  const [currency, setCurrency] = useState(
    initial?.currency ?? currencies[0]?.value ?? ''
  )
  const [description, setDescription] = useState(initial?.description ?? '')
  const [isActive, setIsActive] = useState(initial?.isActive ?? true)
  const [branches, setBranches] = useState<BankDirectoryBranch[]>(initialBranches)
  const [directoryBankId, setDirectoryBankId] = useState(
    initial?.directoryBankId ?? ''
  )
  const [directoryBranchId, setDirectoryBranchId] = useState(
    initial?.directoryBranchId ?? ''
  )
  const [accountHolderName, setAccountHolderName] = useState(
    initial?.accountHolderName ?? ''
  )
  const [accountNumberLast4, setAccountNumberLast4] = useState(
    initial?.accountNumberLast4 ?? ''
  )
  const skipPrimedBranchLoad = useRef(
    Boolean(initial?.directoryBankId && initialBranches.length)
  )

  const linksBank = BANK_LINKED.has(accountType)
  const requiresBranch = BRANCH_REQUIRED.has(accountType)
  const selectedBank = useMemo(
    () => initialBanks.find((bank) => bank.id === directoryBankId) ?? null,
    [initialBanks, directoryBankId]
  )
  const selectedBranch = useMemo(
    () => branches.find((branch) => branch.id === directoryBranchId) ?? null,
    [branches, directoryBranchId]
  )

  useEffect(() => {
    if (!linksBank || !directoryBankId) return

    if (
      skipPrimedBranchLoad.current &&
      directoryBankId === initial?.directoryBankId
    ) {
      skipPrimedBranchLoad.current = false
      return
    }

    let active = true
    void client.bankDirectory.listBranches(directoryBankId).then((result) => {
      if (!active) return
      if (result.error || !result.data) {
        setDirectoryError(
          result.error?.message ?? 'Could not load bank branches.'
        )
        return
      }
      setBranches(result.data.data)
      setDirectoryError(null)
    })
    return () => {
      active = false
    }
  }, [directoryBankId, initial?.directoryBankId, linksBank])

  function changeAccountType(next: BankAccountType) {
    setAccountType(next)
    if (!BANK_LINKED.has(next)) {
      setDirectoryBankId('')
      setDirectoryBranchId('')
      setBranches([])
    }
  }

  function changeBank(next: string) {
    skipPrimedBranchLoad.current = false
    setDirectoryBankId(next)
    setDirectoryBranchId('')
    setBranches([])
    setDirectoryError(null)
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!name.trim() || !currency) {
      setError('Enter an account name and currency.')
      return
    }
    if (linksBank && !directoryBankId) {
      setError('Select the financial institution for this account.')
      return
    }
    if (requiresBranch && !directoryBranchId) {
      setError('Select the branch for this bank account.')
      return
    }
    if (accountNumberLast4 && !/^[A-Za-z0-9]{1,4}$/.test(accountNumberLast4)) {
      setError('Enter only the last four letters or digits of the account number.')
      return
    }

    setError(null)
    startTransition(async () => {
      const bankName = selectedBank?.name ?? initial?.institutionName ?? null
      const params = {
        name,
        accountType,
        currency,
        description: description.trim() || null,
        directoryBankId: linksBank ? directoryBankId || null : null,
        directoryBranchId: linksBank ? directoryBranchId || null : null,
        institutionName: linksBank ? bankName : null,
        accountHolderName: accountHolderName.trim() || null,
        accountNumberLast4: accountNumberLast4.trim() || null,
      }
      const result = initial
        ? await client.bankAccounts.update(initial.id, {
            ...params,
            isActive,
          })
        : await client.bankAccounts.create(params)
      if (result.error || !result.data) {
        setError(result.error?.message ?? 'Failed to save the bank account.')
        return
      }

      router.push(initial ? `/banking/${initial.id}` : `/banking/${result.data.id}`)
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
              changeAccountType(event.target.value as BankAccountType)
            }
          >
            {ACCOUNT_TYPES.map((type) => (
              <NativeSelectOption key={type.value} value={type.value}>
                {type.label}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>

        {linksBank ? (
          <>
            <Field label="Country" htmlFor="bank-account-country">
              <NativeSelect id="bank-account-country" value={countryCode} disabled>
                <NativeSelectOption value={countryCode}>
                  {countryCode === 'JM' ? 'Jamaica (JM)' : countryCode}
                </NativeSelectOption>
              </NativeSelect>
            </Field>
            <Field label="Financial institution" htmlFor="bank-account-bank">
              <NativeSelect
                id="bank-account-bank"
                value={directoryBankId}
                onChange={(event) => changeBank(event.target.value)}
                required
                disabled={Boolean(directoryError) && initialBanks.length === 0}
              >
                <NativeSelectOption value="">Select a bank</NativeSelectOption>
                {initialBanks.map((bank) => (
                  <NativeSelectOption key={bank.id} value={bank.id}>
                    {bank.shortName ?? bank.name} · {bank.bankCode}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </Field>
            <Field
              label={requiresBranch ? 'Branch' : 'Branch (optional)'}
              htmlFor="bank-account-branch"
            >
              <NativeSelect
                id="bank-account-branch"
                value={directoryBranchId}
                onChange={(event) => setDirectoryBranchId(event.target.value)}
                required={requiresBranch}
                disabled={!directoryBankId || Boolean(directoryError)}
              >
                <NativeSelectOption value="">
                  {directoryBankId ? 'Select a branch' : 'Select a bank first'}
                </NativeSelectOption>
                {branches.map((branch) => (
                  <NativeSelectOption key={branch.id} value={branch.id}>
                    {branch.name} · {branch.transitNumber}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
              {selectedBranch ? (
                <p className="text-muted-foreground text-xs tabular-nums">
                  Transit {selectedBranch.transitNumber}
                  {selectedBranch.routingNumber
                    ? ` · Routing ${selectedBranch.routingNumber}`
                    : null}
                </p>
              ) : null}
            </Field>
          </>
        ) : null}

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
        <Field label="Account holder" htmlFor="bank-account-holder">
          <Input
            id="bank-account-holder"
            value={accountHolderName}
            onChange={(event) => setAccountHolderName(event.target.value)}
            placeholder="Organization or account holder"
          />
        </Field>
        <Field label="Account number (last 4 only)" htmlFor="bank-account-last4">
          <Input
            id="bank-account-last4"
            value={accountNumberLast4}
            onChange={(event) => setAccountNumberLast4(event.target.value)}
            maxLength={4}
            autoComplete="off"
            placeholder="1234"
          />
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

      {directoryError ? (
        <p className="text-destructive text-sm">{directoryError}</p>
      ) : null}
      {error ? <p className="text-destructive text-sm">{error}</p> : null}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={isPending || Boolean(directoryError)}>
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
