'use client'

import type { ComponentType, SVGProps } from 'react'
import { formatDateTime } from '@876/core/timestamps'
import { cn } from '@876/core/utils'
import { Folder, Pencil, Sparkles } from '@876/ui/icons'
import type { CrmRequestCategory } from '@/types/crm'

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

function buildEvents(category: CrmRequestCategory): ActivityEvent[] {
  const events: ActivityEvent[] = [
    {
      id: 'created',
      icon: Sparkles,
      tone: 'emerald',
      title: 'Category created',
      at: category.createdAt,
    },
  ]

  if (category.updatedAt && category.updatedAt > category.createdAt) {
    events.push(
      !category.isActive
        ? {
            id: 'archived',
            icon: Folder,
            tone: 'amber',
            title: 'Category archived',
            detail: 'Archived categories are hidden from new request triage.',
            at: category.updatedAt,
          }
        : {
            id: 'updated',
            icon: Pencil,
            tone: 'sky',
            title: 'Category updated',
            at: category.updatedAt,
          }
    )
  }

  return events.sort((a, b) => b.at - a.at)
}

export function CategoryActivity({
  category,
}: {
  category: CrmRequestCategory
}) {
  const events = buildEvents(category)

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
        Detailed change history is not recorded for categories yet.
      </p>
    </div>
  )
}
