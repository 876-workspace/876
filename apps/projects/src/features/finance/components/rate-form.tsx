'use client'

import type { Rate, RateScope } from '@876/projects'
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

const SCOPES: RateScope[] = ['project', 'user', 'project-user']

function dateInput(timestamp: number | null | undefined) {
  if (!timestamp) return ''
  return new Date(timestamp * 1000).toISOString().slice(0, 10)
}

function dateTimestamp(value: string) {
  if (!value) return null
  return Math.floor(new Date(`${value}T00:00:00Z`).getTime() / 1000)
}

type Props =
  | { mode: 'create'; projectId: string; rate?: never }
  | { mode: 'edit'; projectId: string; rate: Rate }

export function RateForm(props: Props) {
  const router = useRouter()
  const editing = props.mode === 'edit'
  const rate = editing ? props.rate : null
  const [scope, setScope] = useState<RateScope>(rate?.scope ?? 'project')
  const [userId, setUserId] = useState(rate?.userId ?? '')
  const [currency, setCurrency] = useState(rate?.currency ?? 'USD')
  const [billRate, setBillRate] = useState(
    formatMinorForInput(
      rate?.billRateMinor,
      fractionDigitsForCurrency(rate?.currency ?? 'USD')
    )
  )
  const [costRate, setCostRate] = useState(
    formatMinorForInput(
      rate?.costRateMinor,
      fractionDigitsForCurrency(rate?.currency ?? 'USD')
    )
  )
  const [effectiveFrom, setEffectiveFrom] = useState(
    dateInput(rate?.effectiveFrom)
  )
  const [effectiveTo, setEffectiveTo] = useState(dateInput(rate?.effectiveTo))
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<AppErrorValue | null>(null)

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending) return

    const code = currency.trim().toUpperCase()
    if (!/^[A-Z]{3}$/.test(code)) {
      setError({
        code: 'projects/rate-invalid-currency',
        message: 'Enter a three-letter currency code.',
      })
      return
    }

    const digits = fractionDigitsForCurrency(code)
    const billRateMinor = parseDecimalToMinor(billRate, digits)
    const costRateMinor = parseDecimalToMinor(costRate, digits)
    if (billRateMinor === null || costRateMinor === null) {
      setError({
        code: 'projects/rate-invalid-amount',
        message: 'Enter valid hourly bill and cost rates.',
      })
      return
    }

    const from = dateTimestamp(effectiveFrom)
    const to = dateTimestamp(effectiveTo)
    if (from !== null && to !== null && to <= from) {
      setError({
        code: 'projects/rate-invalid-period',
        message: 'The effective end must be after its start.',
      })
      return
    }

    if (scope !== 'project' && userId.trim() === '') {
      setError({
        code: 'projects/rate-missing-user',
        message: 'User rates need a member.',
      })
      return
    }

    setPending(true)
    setError(null)

    const result =
      editing && rate
        ? await financeClient.updateRate(props.projectId, rate.id, {
            userId: scope === 'project' ? null : userId.trim(),
            billRateMinor,
            costRateMinor,
            currency: code,
            effectiveFrom: from,
            effectiveTo: to,
          })
        : await financeClient.createRate(props.projectId, {
            scope,
            userId: scope === 'project' ? null : userId.trim(),
            billRateMinor,
            costRateMinor,
            currency: code,
            effectiveFrom: from,
            effectiveTo: to,
          })

    setPending(false)
    if (result.error || !result.data) {
      setError(
        result.error ?? {
          code: 'projects/rate-save-failed',
          message: 'The rate could not be saved.',
        }
      )
      return
    }

    const target = result.data.projectId ?? props.projectId
    router.push(`/projects/${encodeURIComponent(target)}/finance`)
  }

  return (
    <form
      onSubmit={onSubmit}
      className="876-card max-w-3xl space-y-5 p-6"
      aria-label={editing ? 'Edit rate' : 'New rate'}
    >
      {error ? (
        <AppError title="The rate could not be saved" error={error} />
      ) : null}

      <FormRow label="Scope" htmlFor="rate-scope" required>
        <NativeSelect
          id="rate-scope"
          value={scope}
          onChange={(event) => setScope(event.target.value as RateScope)}
          className="w-full"
          disabled={editing}
        >
          {SCOPES.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </NativeSelect>
      </FormRow>

      {scope !== 'project' ? (
        <FormRow label="Member" htmlFor="rate-user" required>
          <Input
            id="rate-user"
            value={userId}
            onChange={(event) => setUserId(event.target.value)}
            placeholder="User id"
          />
        </FormRow>
      ) : null}

      <div className="grid gap-5 sm:grid-cols-2">
        <FormRow label="Bill rate /h" htmlFor="rate-bill" required>
          <Input
            id="rate-bill"
            value={billRate}
            onChange={(event) => setBillRate(event.target.value)}
            placeholder="0.00"
            inputMode="decimal"
          />
        </FormRow>
        <FormRow label="Cost rate /h" htmlFor="rate-cost" required>
          <Input
            id="rate-cost"
            value={costRate}
            onChange={(event) => setCostRate(event.target.value)}
            placeholder="0.00"
            inputMode="decimal"
          />
        </FormRow>
      </div>

      <FormRow label="Currency" htmlFor="rate-currency" required>
        <Input
          id="rate-currency"
          value={currency}
          onChange={(event) => setCurrency(event.target.value)}
          placeholder="USD"
          maxLength={3}
        />
      </FormRow>

      <div className="grid gap-5 sm:grid-cols-2">
        <FormRow label="Effective from" htmlFor="rate-from">
          <Input
            id="rate-from"
            type="date"
            value={effectiveFrom}
            onChange={(event) => setEffectiveFrom(event.target.value)}
          />
        </FormRow>
        <FormRow label="Effective to" htmlFor="rate-to">
          <Input
            id="rate-to"
            type="date"
            value={effectiveTo}
            onChange={(event) => setEffectiveTo(event.target.value)}
          />
        </FormRow>
      </div>

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
          {pending ? 'Saving…' : editing ? 'Save' : 'Add'}
        </Button>
      </div>
    </form>
  )
}
