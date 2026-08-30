import type { WorkEvent, WorkReminder, WorkTask } from '@876/work'
import type { ReactNode } from 'react'

import { cn } from '../lib/utils'

type AgendaItem =
  | { type: 'task'; id: string; at: number; value: WorkTask }
  | { type: 'reminder'; id: string; at: number; value: WorkReminder }
  | { type: 'event'; id: string; at: number; value: WorkEvent }

export type WorkAgendaProps = {
  tasks?: readonly WorkTask[]
  reminders?: readonly WorkReminder[]
  events?: readonly WorkEvent[]
  className?: string
  empty?: ReactNode
  renderItem?: (item: AgendaItem) => ReactNode
}

function itemsOf(
  tasks: readonly WorkTask[],
  reminders: readonly WorkReminder[],
  events: readonly WorkEvent[]
): AgendaItem[] {
  return [
    ...tasks.flatMap((task) => {
      const at = task.startAt ?? task.dueAt
      return at == null ? [] : [{ type: 'task' as const, id: task.id, at, value: task }]
    }),
    ...reminders.map((reminder) => ({
      type: 'reminder' as const,
      id: reminder.id,
      at: reminder.remindAt,
      value: reminder,
    })),
    ...events.flatMap((event) =>
      event.startAt == null
        ? []
        : [{ type: 'event' as const, id: event.id, at: event.startAt, value: event }]
    ),
  ].sort((left, right) => left.at - right.at || left.id.localeCompare(right.id))
}

export function WorkAgenda({
  tasks = [],
  reminders = [],
  events = [],
  className,
  empty = 'Nothing scheduled',
  renderItem,
}: WorkAgendaProps) {
  const items = itemsOf(tasks, reminders, events)
  if (items.length === 0)
    return <div className={cn('text-sm text-muted-foreground', className)}>{empty}</div>

  return (
    <ol className={cn('space-y-3', className)}>
      {items.map((item) => (
        <li key={`${item.type}:${item.id}`}>
          {renderItem ? (
            renderItem(item)
          ) : (
            <div className="flex items-baseline gap-3">
              <time className="w-20 shrink-0 text-xs text-muted-foreground">
                {new Date(item.at * 1000).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </time>
              <span className="text-sm">
                {item.type === 'event' ? item.value.title : item.value.title}
              </span>
            </div>
          )}
        </li>
      ))}
    </ol>
  )
}
