'use client'

import type { Budget, BudgetScope } from '@876/projects'
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
  parseDecimalToMinor,
  parseThresholdPercent,
  parseWholeHours,
} from '../money-input'

const SCOPES: BudgetScope[] = ['project', 'milestone', 'user']

function dateInput(timestamp: number | null | undefined) {
  if (!timestamp) return ''
  return new Date(timestamp * 1000).toISOString().slice(0, 10)
}

function dateTimestamp(value: string) {
  if (!value) return null
  return Math.floor(new Date(`${value}T00:00:00Z`).getTime() / 1000)
}

type Props =
  | { mode: 'create'; projectId: string; budget?: never; currency: string }
  | { mode: 'edit'; projectId: string; budget: Budget; currency: string }

export function BudgetForm(props: Props) {
  const router = useRouter()
  const editing = props.mode === 'edit'
  const budget = editing ? props.budget : null
  const [scope, setScope] = useState<BudgetScope>(budget?.scope ?? 'project')
  const [milestoneId, setMilestoneId] = useState(budget?.milestoneId ?? '')
  const [userId, setUserId] = useState(budget?.userId ?? '')
  const [kind, setKind] = useState<'amount' | 'hours'>(
    budget?.hours !== null && budget?.hours !== undefined ? 'hours' : 'amount'
  )
  const [amount, setAmount] = useState(
    formatMinorForInput(budget?.amountMinor, 2)
  )
  const [hours, setHours] = useState(
    budget?.hours === null || budget?.hours === undefined
      ? ''
      : String(budget.hours)
  )
  const [threshold, setThreshold] = useState(
    budget ? String(budget.thresholdPercent) : '80'
  )
  const [periodStart, setPeriodStart] = useState(dateInput(budget?.periodStart))
  const [periodEnd, setPeriodEnd] = useState(dateInput(budget?.periodEnd))
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<AppErrorValue | null>(null)

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending) return

    const thresholdPercent = parseThresholdPercent(threshold)
    if (thresholdPercent === null) {
      setError({
        code: 'projects/budget-invalid-threshold',
        message: 'Enter an alert threshold between 1 and 100.',
      })
      return
    }

    let amountMinor: number | null = null
    let hoursValue: number | null = null
    if (kind === 'amount') {
      const parsed = parseDecimalToMinor(amount, 2)
      if (parsed === null) {
        setError({
          code: 'projects/budget-invalid-amount',
          message: 'Enter a valid budget amount.',
        })
        return
      }
      amountMinor = parsed
    } else {
      const parsed = parseWholeHours(hours)
      if (parsed === null) {
        setError({
          code: 'projects/budget-invalid-hours',
          message: 'Enter whole hours for the budget.',
        })
        return
      }
      hoursValue = parsed
    }

    const start = dateTimestamp(periodStart)
    const end = dateTimestamp(periodEnd)
    if ((periodStart && start === null) || (periodEnd && end === null)) {
      setError({
        code: 'projects/budget-invalid-period',
        message: 'Enter valid period dates.',
      })
      return
    }
    if (start !== null && end !== null && end <= start) {
      setError({
        code: 'projects/budget-invalid-period',
        message: 'The period end must be after its start.',
      })
      return
    }

    setPending(true)
    setError(null)

    const payload = {
      amountMinor,
      hours: hoursValue,
      thresholdPercent,
      periodStart: start,
      periodEnd: end,
    }

    const result =
      editing && budget
        ? await financeClient.updateBudget(props.projectId, budget.id, {
            ...payload,
            milestoneId: scope === 'milestone' ? milestoneId.trim() || null : null,
            userId: scope === 'user' ? userId.trim() || null : null,
          })
        : await financeClient.createBudget(props.projectId, {
            scope,
            milestoneId: scope === 'milestone' ? milestoneId.trim() || null : null,
            userId: scope === 'user' ? userId.trim() || null : null,
            ...payload,
          })

    setPending(false)
    if (result.error || !result.data) {
      setError(
        result.error ?? {
          code: 'projects/budget-save-failed',
          message: 'The budget could not be saved.',
        }
      )
      return
    }

    router.push(
      `/projects/${encodeURIComponent(result.data.projectId)}/finance`
    )
  }

  return (
    <form
      onSubmit={onSubmit}
      className="876-card max-w-3xl space-y-5 p-6"
      aria-label={editing ? 'Edit budget' : 'New budget'}
    >
      {error ? (
        <AppError title="The budget could not be saved" error={error} />
      ) : null}

      <FormRow label="Scope" htmlFor="budget-scope" required>
        <NativeSelect
          id="budget-scope"
          value={scope}
          onChange={(event) => setScope(event.target.value as BudgetScope)}
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

      {scope === 'milestone' ? (
        <FormRow label="Milestone" htmlFor="budget-milestone" required>
          <Input
            id="budget-milestone"
            value={milestoneId}
            onChange={(event) => setMilestoneId(event.target.value)}
            placeholder="Milestone id"
          />
        </FormRow>
      ) : null}

      {scope === 'user' ? (
        <FormRow label="Member" htmlFor="budget-user" required>
          <Input
            id="budget-user"
            value={userId}
            onChange={(event) => setUserId(event.target.value)}
            placeholder="User id"
          />
        </FormRow>
      ) : null}

      <FormRow label="Type" htmlFor="budget-kind-amount" required>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              id="budget-kind-amount"
              type="radio"
              name="budget-kind"
              checked={kind === 'amount'}
              onChange={() => setKind('amount')}
            />
            Amount
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              id="budget-kind-hours"
              type="radio"
              name="budget-kind"
              checked={kind === 'hours'}
              onChange={() => setKind('hours')}
            />
            Hours
          </label>
        </div>
      </FormRow>

      {kind === 'amount' ? (
        <FormRow label={`Amount (${props.currency})`} htmlFor="budget-amount" required>
          <Input
            id="budget-amount"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            placeholder="0.00"
            inputMode="decimal"
          />
        </FormRow>
      ) : (
        <FormRow label="Hours" htmlFor="budget-hours" required>
          <Input
            id="budget-hours"
            value={hours}
            onChange={(event) => setHours(event.target.value)}
            placeholder="120"
            inputMode="numeric"
          />
        </FormRow>
      )}

      <FormRow label="Alert at %" htmlFor="budget-threshold" required>
        <Input
          id="budget-threshold"
          value={threshold}
          onChange={(event) => setThreshold(event.target.value)}
          placeholder="80"
          inputMode="numeric"
        />
      </FormRow>

      <div className="grid gap-5 sm:grid-cols-2">
        <FormRow label="Starts" htmlFor="budget-starts">
          <Input
            id="budget-starts"
            type="date"
            value={periodStart}
            onChange={(event) => setPeriodStart(event.target.value)}
          />
        </FormRow>
        <FormRow label="Ends" htmlFor="budget-ends">
          <Input
            id="budget-ends"
            type="date"
            value={periodEnd}
            onChange={(event) => setPeriodEnd(event.target.value)}
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
