import type { AdminSubscription } from '@876/admin'

import { formatDateTime } from '@/lib/format'
import { cn } from '@876/core/utils'

type ActivityEvent = {
  at: number
  label: string
  detail?: string
  tone: 'neutral' | 'info' | 'warn' | 'danger'
}

const toneDotClass: Record<ActivityEvent['tone'], string> = {
  neutral: 'bg-muted-foreground/50',
  info: 'bg-emerald-500',
  warn: 'bg-amber-500',
  danger: 'bg-red-500',
}

/** Derives the subscription's lifecycle timeline from its own timestamps. */
function lifecycleEvents(sub: AdminSubscription): ActivityEvent[] {
  const events: ActivityEvent[] = []

  if (sub.created_at)
    events.push({ at: sub.created_at, label: 'Created', tone: 'neutral' })
  if (sub.start_date)
    events.push({ at: sub.start_date, label: 'Started', tone: 'info' })
  if (sub.trial_start)
    events.push({
      at: sub.trial_start,
      label: 'Trial started',
      tone: 'info',
    })
  if (sub.trial_end)
    events.push({ at: sub.trial_end, label: 'Trial ended', tone: 'neutral' })
  if (sub.cancel_at && !sub.canceled_at)
    events.push({
      at: sub.cancel_at,
      label: 'Cancellation scheduled',
      detail: sub.cancel_at_period_end
        ? 'Takes effect at period end'
        : undefined,
      tone: 'warn',
    })
  if (sub.canceled_at)
    events.push({ at: sub.canceled_at, label: 'Canceled', tone: 'danger' })
  if (sub.ended_at)
    events.push({ at: sub.ended_at, label: 'Ended', tone: 'danger' })
  if (sub.updated_at)
    events.push({
      at: sub.updated_at,
      label: 'Last updated',
      tone: 'neutral',
    })

  return events.sort((a, b) => b.at - a.at)
}

/**
 * Chronological lifecycle timeline for a subscription, rendered newest first.
 */
export function SubscriptionActivity({
  subscription: sub,
}: {
  subscription: AdminSubscription
}) {
  const events = lifecycleEvents(sub)

  return (
    <ol className="relative space-y-4 ps-1">
      {events.map((event, index) => (
        <li key={`${event.label}-${event.at}`} className="flex gap-3">
          <div className="flex flex-col items-center">
            <span
              aria-hidden="true"
              className={cn(
                'mt-1.5 size-2 shrink-0 rounded-full',
                toneDotClass[event.tone]
              )}
            />
            {index < events.length - 1 && (
              <span
                aria-hidden="true"
                className="bg-876-surface-border w-px grow"
              />
            )}
          </div>
          <div className="-mt-0.5 min-w-0 pb-0.5">
            <p className="text-[0.8125rem] leading-5 font-medium">
              {event.label}
            </p>
            <p className="text-muted-foreground text-xs">
              {formatDateTime(event.at)}
              {event.detail ? ` · ${event.detail}` : ''}
            </p>
          </div>
        </li>
      ))}
    </ol>
  )
}
