'use client'

import type { Reminder } from '@876/projects/contracts'
import { AppError, type AppErrorValue } from '@876/ui/app-error'
import { Button } from '@876/ui/button'
import { FormRow } from '@876/ui/form-row'
import { Input } from '@876/ui/input'
import { NativeSelect } from '@876/ui/native-select'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { describeRecurrence } from '@/features/projects/event-input'
import {
  formatReminderTiming,
  reminderTargetInput,
} from '@/features/projects/reminder-timing'
import { remindersClient } from '@/lib/client/reminders'
import type { ReminderTarget } from '@/types/events'

const UNIT_MINUTES = { minutes: 1, hours: 60, days: 1_440 } as const
type Unit = keyof typeof UNIT_MINUTES

type Props = {
  target: ReminderTarget
  /** Only the caller's own reminders are passed in — the API scopes them. */
  reminders: readonly Reminder[]
  /** The date an offset counts back from, named for the reader. */
  base?: string
  loadError?: AppErrorValue | null
}

/**
 * Reminders for one record: intent the user wrote down, listed with when it is
 * due. Nothing here promises delivery — there is no scheduler behind it yet.
 */
export function RemindersPanel({
  target,
  reminders,
  base = 'the due date',
  loadError = null,
}: Props) {
  const router = useRouter()
  const [amount, setAmount] = useState('2')
  const [unit, setUnit] = useState<Unit>('hours')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<AppErrorValue | null>(null)

  async function addReminder() {
    if (pending) return

    const value = Number(amount)
    if (!Number.isFinite(value) || value <= 0) {
      setError({
        code: 'projects/reminder-invalid-offset',
        message: `Enter how long before ${base}.`,
      })
      return
    }

    setPending(true)
    setError(null)
    const result = await remindersClient.create({
      ...reminderTargetInput(target),
      offsetMinutesBeforeDue: Math.round(value * UNIT_MINUTES[unit]),
    })
    setPending(false)
    if (result.error) {
      setError(result.error)
      return
    }
    router.refresh()
  }

  async function removeReminder(reminderId: string) {
    if (pending) return
    setPending(true)
    setError(null)
    const result = await remindersClient.delete(reminderId)
    setPending(false)
    if (result.error) {
      setError(result.error)
      return
    }
    router.refresh()
  }

  return (
    <div className="space-y-4">
      {error ? (
        <AppError
          title="The reminder was not saved"
          error={error}
          variant="banner"
        />
      ) : null}
      {!error && loadError ? (
        <AppError
          title="Reminders could not be loaded"
          error={loadError}
          variant="banner"
        />
      ) : null}

      {reminders.length === 0 ? (
        <p className="text-muted-foreground text-sm">No reminders.</p>
      ) : (
        <ul aria-label="Reminders" className="space-y-2">
          {reminders.map((reminder) => (
            <li
              key={reminder.id}
              className="flex flex-wrap items-center justify-between gap-3 text-sm"
            >
              <span className="flex min-w-0 flex-col">
                <span>{formatReminderTiming(reminder, base)}</span>
                {describeRecurrence(reminder.recurrence) ? (
                  <span className="text-muted-foreground text-xs">
                    {describeRecurrence(reminder.recurrence)}
                  </span>
                ) : null}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                aria-label={`Remove reminder: ${formatReminderTiming(reminder, base)}`}
                onClick={() => removeReminder(reminder.id)}
                disabled={pending}
              >
                Remove
              </Button>
            </li>
          ))}
        </ul>
      )}

      <div className="border-border/60 grid gap-3 border-t pt-4 sm:grid-cols-3">
        <FormRow label="Before" htmlFor="reminder-amount">
          <Input
            id="reminder-amount"
            type="number"
            min={1}
            step={1}
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
          />
        </FormRow>
        <FormRow label="Unit" htmlFor="reminder-unit">
          <NativeSelect
            id="reminder-unit"
            value={unit}
            onChange={(event) => setUnit(event.target.value as Unit)}
            className="w-full"
          >
            <option value="minutes">Minutes</option>
            <option value="hours">Hours</option>
            <option value="days">Days</option>
          </NativeSelect>
        </FormRow>
        <div className="flex items-end">
          <Button
            type="button"
            variant="info"
            onClick={addReminder}
            disabled={pending}
            className="w-full"
          >
            Add reminder
          </Button>
        </div>
      </div>
    </div>
  )
}
