'use client'

import type { ComponentType, SVGProps } from 'react'
import { formatDateTime } from '@876/core/timestamps'
import { cn } from '@876/core/utils'
import { Folder, Pencil, Sparkles } from '@876/ui/icons'
import type { CrmCustomerRow } from './customers-table'

type Tone = 'emerald' | 'sky' | 'amber'

type ActivityEvent = {
  id: string
  icon: ComponentType<SVGProps<SVGSVGElement>>
  tone: Tone
  title: string
  detail?: string
  at: number
}

const TONE_CLASSES: Record<Tone, string> = {
  emerald:
    'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  sky: 'border-sky-500/30 bg-sky-500/10 text-sky-600 dark:text-sky-400',
  amber:
    'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400',
}

function buildEvents(customer: CrmCustomerRow): ActivityEvent[] {
  const events: ActivityEvent[] = []

  if (customer.createdAt) {
    events.push({
      id: 'created',
      icon: Sparkles,
      tone: 'emerald',
      title: 'Customer record created',
      at: customer.createdAt,
    })
  }

  if (
    customer.updatedAt &&
    customer.createdAt &&
    customer.updatedAt > customer.createdAt
  ) {
    events.push(
      customer.status === 'INACTIVE'
        ? {
            id: 'archived',
            icon: Folder,
            tone: 'amber',
            title: 'Customer deactivated',
            detail:
              'Deactivated customer accounts are hidden from active triage workflows.',
            at: customer.updatedAt,
          }
        : {
            id: 'updated',
            icon: Pencil,
            tone: 'sky',
            title: 'Customer updated',
            at: customer.updatedAt,
          }
    )
  }

  if (events.length === 0) {
    events.push({
      id: 'active',
      icon: Sparkles,
      tone: 'emerald',
      title: 'Customer active',
      at: Math.floor(Date.now() / 1000),
    })
  }

  return events.sort((a, b) => b.at - a.at)
}

export function CustomerActivity({ customer }: { customer: CrmCustomerRow }) {
  const events = buildEvents(customer)

  return (
    <div className="space-y-4">
      <ol className="relative">
        {events.map((event, index) => {
          const Icon = event.icon
          const isLast = index === events.length - 1

          return (
            <li key={event.id} className="relative flex gap-3 pb-5 last:pb-0">
              {isLast ? null : (
                <span
                  aria-hidden
                  className="bg-876-surface-border absolute top-8 bottom-0 left-[0.6875rem] w-px"
                />
              )}

              <span
                className={cn(
                  'bg-background relative z-10 flex size-6 shrink-0 items-center justify-center rounded-full border',
                  TONE_CLASSES[event.tone]
                )}
              >
                <Icon className="size-3.5" />
              </span>

              <div className="min-w-0 flex-1 pt-0.5">
                <p className="text-foreground text-[0.8125rem] font-medium">
                  {event.title}
                </p>
                <p className="text-muted-foreground text-xs tabular-nums">
                  {formatDateTime(event.at)}
                </p>
                {event.detail ? (
                  <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                    {event.detail}
                  </p>
                ) : null}
              </div>
            </li>
          )
        })}
      </ol>

      <p className="border-876-surface-border text-muted-foreground border-t pt-3 text-xs">
        Detailed change history is not recorded for customers yet.
      </p>
    </div>
  )
}
