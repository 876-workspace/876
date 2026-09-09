import type { WorkRecurrenceDraft, WorkRecurrenceRule } from '@876/work'
import type { FormEvent } from 'react'

import { cn } from '@876/core/utils'

const WEEKDAYS = [
  ['MO', 'Mon'],
  ['TU', 'Tue'],
  ['WE', 'Wed'],
  ['TH', 'Thu'],
  ['FR', 'Fri'],
  ['SA', 'Sat'],
  ['SU', 'Sun'],
] as const

function dateTimeLocalValue(unixSeconds: number | null | undefined): string {
  if (unixSeconds == null) return ''
  const date = new Date(unixSeconds * 1000)
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 16)
}

function numberValue(value: FormDataEntryValue | null) {
  if (typeof value !== 'string' || !value.trim()) return undefined
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined
}

export type WorkRecurrenceEditorProps = {
  rule: WorkRecurrenceRule | null
  pending?: boolean
  onSave: (input: WorkRecurrenceDraft) => void | Promise<void>
  onClear?: () => void | Promise<void>
  className?: string
}

/** Controlled recurrence presentation. Persistence and authorization stay outside Work UI. */
export function WorkRecurrenceEditor({
  rule,
  pending = false,
  onSave,
  onClear,
  className,
}: WorkRecurrenceEditorProps) {
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const frequency = String(
      data.get('frequency')
    ) as WorkRecurrenceDraft['frequency']
    const interval = numberValue(data.get('interval')) ?? 1
    const count = numberValue(data.get('count'))
    const untilText = String(data.get('untilAt') ?? '').trim()
    const untilDate = untilText ? new Date(untilText) : null
    if (count && untilDate) return

    const byDay = data.getAll('byDay').map(String) as NonNullable<
      WorkRecurrenceDraft['byDay']
    >
    const monthDay = numberValue(data.get('byMonthDay'))
    const timeZone =
      String(data.get('timeZone') ?? '').trim() ||
      Intl.DateTimeFormat().resolvedOptions().timeZone ||
      'UTC'

    await onSave({
      frequency,
      interval,
      ...(frequency === 'WEEKLY' && byDay.length > 0 ? { byDay } : {}),
      ...(frequency === 'MONTHLY' && monthDay
        ? { byMonthDay: [monthDay] }
        : {}),
      ...(count ? { count } : {}),
      ...(untilDate && !Number.isNaN(untilDate.getTime())
        ? { untilAt: Math.floor(untilDate.getTime() / 1000) }
        : {}),
      timeZone,
      weekStart: rule?.weekStart ?? 'MO',
    })
  }

  return (
    <section
      className={cn(
        'border-876-surface-border rounded-xl border p-3',
        className
      )}
      aria-label="Recurrence"
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium">Repeat</p>
          <p className="text-muted-foreground text-xs">
            {rule ? 'Edit this recurring series.' : 'Make this item repeat.'}
          </p>
        </div>
        {rule && onClear ? (
          <button
            type="button"
            disabled={pending}
            onClick={() => void onClear()}
            className="border-876-surface-border focus-visible:ring-ring rounded-lg border px-2.5 py-1.5 text-xs font-medium focus-visible:ring-2 focus-visible:outline-none disabled:opacity-60"
          >
            Stop repeating
          </button>
        ) : null}
      </div>

      <form onSubmit={submit} className="mt-3 space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <label className="text-xs font-medium">
            Frequency
            <select
              name="frequency"
              defaultValue={rule?.frequency ?? 'WEEKLY'}
              disabled={pending}
              className="border-876-surface-border bg-background mt-1 w-full rounded-lg border px-2 py-2 text-sm"
            >
              <option value="DAILY">Daily</option>
              <option value="WEEKLY">Weekly</option>
              <option value="MONTHLY">Monthly</option>
              <option value="YEARLY">Yearly</option>
            </select>
          </label>
          <label className="text-xs font-medium">
            Every
            <input
              name="interval"
              type="number"
              min={1}
              defaultValue={rule?.interval ?? 1}
              disabled={pending}
              className="border-876-surface-border bg-background mt-1 w-full rounded-lg border px-2 py-2 text-sm"
            />
          </label>
        </div>

        <fieldset>
          <legend className="text-xs font-medium">Weekly days</legend>
          <div className="mt-1 flex flex-wrap gap-2">
            {WEEKDAYS.map(([value, label]) => (
              <label key={value} className="text-muted-foreground text-xs">
                <input
                  type="checkbox"
                  name="byDay"
                  value={value}
                  defaultChecked={rule?.byDay.includes(value) ?? false}
                  disabled={pending}
                  className="mr-1"
                />
                {label}
              </label>
            ))}
          </div>
        </fieldset>

        <div className="grid grid-cols-2 gap-2">
          <label className="text-xs font-medium">
            Monthly day
            <input
              name="byMonthDay"
              type="number"
              min={1}
              max={31}
              defaultValue={rule?.byMonthDay[0] ?? ''}
              disabled={pending}
              className="border-876-surface-border bg-background mt-1 w-full rounded-lg border px-2 py-2 text-sm"
            />
          </label>
          <label className="text-xs font-medium">
            Occurrences
            <input
              name="count"
              type="number"
              min={1}
              defaultValue={rule?.count ?? ''}
              disabled={pending}
              className="border-876-surface-border bg-background mt-1 w-full rounded-lg border px-2 py-2 text-sm"
            />
          </label>
        </div>

        <label className="block text-xs font-medium">
          Or repeat until
          <input
            name="untilAt"
            type="datetime-local"
            defaultValue={dateTimeLocalValue(rule?.untilAt)}
            disabled={pending}
            className="border-876-surface-border bg-background mt-1 w-full rounded-lg border px-2 py-2 text-sm"
          />
        </label>
        <label className="block text-xs font-medium">
          Time zone
          <input
            name="timeZone"
            defaultValue={
              rule?.timeZone ??
              Intl.DateTimeFormat().resolvedOptions().timeZone ??
              'UTC'
            }
            disabled={pending}
            className="border-876-surface-border bg-background mt-1 w-full rounded-lg border px-2 py-2 text-sm"
          />
        </label>

        <button
          type="submit"
          disabled={pending}
          className="bg-primary text-primary-foreground focus-visible:ring-ring rounded-lg px-3 py-2 text-xs font-medium focus-visible:ring-2 focus-visible:outline-none disabled:cursor-wait disabled:opacity-60"
        >
          {pending ? 'Saving…' : rule ? 'Save series' : 'Add recurrence'}
        </button>
      </form>
    </section>
  )
}
