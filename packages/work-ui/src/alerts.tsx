import type { WorkAlert } from '@876/work'
import type { FormEvent } from 'react'

import { cn } from '@876/core/utils'

export type WorkAlertDraft = {
  triggerType: 'ABSOLUTE' | 'RELATIVE'
  triggerAt?: number | null
  offsetSeconds?: number | null
  action?: 'NOTIFICATION' | 'EMAIL'
}

export type WorkAlertsProps = {
  alerts: readonly WorkAlert[]
  pending?: boolean
  canManage?: boolean
  onCreate?: (input: WorkAlertDraft) => boolean | Promise<boolean>
  onDismiss?: (alert: WorkAlert) => void | Promise<void>
  onRemove?: (alert: WorkAlert) => void | Promise<void>
  className?: string
}

function label(value: string) {
  return value.replaceAll('_', ' ').toLowerCase()
}

function alertWhen(alert: WorkAlert) {
  if (alert.triggerType === 'ABSOLUTE' && alert.triggerAt != null)
    return new Date(alert.triggerAt * 1000).toLocaleString()
  if (alert.offsetSeconds != null) {
    const minutes = Math.round(Math.abs(alert.offsetSeconds) / 60)
    return `${minutes} minute${minutes === 1 ? '' : 's'} before`
  }
  return 'Scheduled'
}

export function WorkAlerts({
  alerts,
  pending = false,
  canManage = false,
  onCreate,
  onDismiss,
  onRemove,
  className,
}: WorkAlertsProps) {
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!onCreate) return
    const form = event.currentTarget
    const data = new FormData(form)
    const triggerType = String(data.get('triggerType')) as
      'ABSOLUTE' | 'RELATIVE'
    const action = String(data.get('action')) as 'NOTIFICATION' | 'EMAIL'

    let input: WorkAlertDraft
    if (triggerType === 'ABSOLUTE') {
      const raw = String(data.get('triggerAt') ?? '')
      const date = raw ? new Date(raw) : null
      if (!date || Number.isNaN(date.getTime())) return
      input = {
        triggerType,
        triggerAt: Math.floor(date.getTime() / 1000),
        action,
      }
    } else {
      const minutes = Number(data.get('offsetMinutes'))
      if (!Number.isFinite(minutes) || minutes < 0) return
      input = {
        triggerType,
        offsetSeconds: -Math.round(minutes * 60),
        action,
      }
    }

    const created = await onCreate(input)
    if (created) form.reset()
  }

  return (
    <section
      className={cn(
        'border-876-surface-border rounded-xl border p-3',
        className
      )}
      aria-label="Alerts"
    >
      <p className="text-sm font-medium">Alerts</p>
      <p className="text-muted-foreground mt-1 text-xs">
        Work schedules delivery; this surface only manages alert records.
      </p>

      <ul className="mt-3 space-y-2" aria-live="polite">
        {alerts.length === 0 ? (
          <li className="text-muted-foreground text-xs">No alerts.</li>
        ) : (
          alerts.map((alert) => (
            <li
              key={alert.id}
              className="border-876-surface-border flex items-start justify-between gap-2 rounded-lg border p-2"
            >
              <div>
                <p className="text-xs font-medium">{alertWhen(alert)}</p>
                <p className="text-muted-foreground text-[11px]">
                  {label(alert.action)} · {label(alert.status)}
                </p>
              </div>
              {canManage ? (
                <div className="flex gap-1">
                  {alert.status === 'SCHEDULED' && onDismiss ? (
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => void onDismiss(alert)}
                      className="rounded px-2 py-1 text-[11px] font-medium disabled:opacity-60"
                    >
                      Dismiss
                    </button>
                  ) : null}
                  {onRemove ? (
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => void onRemove(alert)}
                      className="rounded px-2 py-1 text-[11px] font-medium disabled:opacity-60"
                    >
                      Remove
                    </button>
                  ) : null}
                </div>
              ) : null}
            </li>
          ))
        )}
      </ul>

      {canManage && onCreate ? (
        <form onSubmit={submit} className="mt-3 space-y-2 border-t pt-3">
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs font-medium">
              Trigger
              <select
                name="triggerType"
                defaultValue="RELATIVE"
                disabled={pending}
                className="border-876-surface-border bg-background mt-1 w-full rounded-lg border px-2 py-2 text-sm"
              >
                <option value="RELATIVE">Before item</option>
                <option value="ABSOLUTE">At a time</option>
              </select>
            </label>
            <label className="text-xs font-medium">
              Delivery
              <select
                name="action"
                defaultValue="NOTIFICATION"
                disabled={pending}
                className="border-876-surface-border bg-background mt-1 w-full rounded-lg border px-2 py-2 text-sm"
              >
                <option value="NOTIFICATION">Notification</option>
                <option value="EMAIL">Email</option>
              </select>
            </label>
          </div>
          <label className="block text-xs font-medium">
            Minutes before (for relative alerts)
            <input
              name="offsetMinutes"
              type="number"
              min={0}
              defaultValue={15}
              disabled={pending}
              className="border-876-surface-border bg-background mt-1 w-full rounded-lg border px-2 py-2 text-sm"
            />
          </label>
          <label className="block text-xs font-medium">
            Exact time (for absolute alerts)
            <input
              name="triggerAt"
              type="datetime-local"
              disabled={pending}
              className="border-876-surface-border bg-background mt-1 w-full rounded-lg border px-2 py-2 text-sm"
            />
          </label>
          <button
            type="submit"
            disabled={pending}
            className="bg-primary text-primary-foreground rounded-lg px-3 py-2 text-xs font-medium disabled:opacity-60"
          >
            Add alert
          </button>
        </form>
      ) : null}
    </section>
  )
}
