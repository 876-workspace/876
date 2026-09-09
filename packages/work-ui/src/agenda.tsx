import type { WorkEvent, WorkReminder, WorkTask } from '@876/work'
import type { ReactNode } from 'react'

import { cn } from '@876/core/utils'

export type WorkAgendaItem =
  | { type: 'task'; id: string; at: number; allDay: false; value: WorkTask }
  | {
      type: 'reminder'
      id: string
      at: number
      allDay: false
      value: WorkReminder
    }
  | {
      type: 'event'
      id: string
      at: number | null
      allDay: boolean
      value: WorkEvent
    }

export type WorkAgendaProps = {
  tasks?: readonly WorkTask[]
  reminders?: readonly WorkReminder[]
  events?: readonly WorkEvent[]
  className?: string
  empty?: ReactNode
  renderItem?: (item: WorkAgendaItem) => ReactNode
}

function compareItems(left: WorkAgendaItem, right: WorkAgendaItem): number {
  if (left.allDay !== right.allDay) return left.allDay ? -1 : 1
  if (left.at !== right.at) {
    if (left.at == null) return -1
    if (right.at == null) return 1
    return left.at - right.at
  }
  return left.id.localeCompare(right.id)
}

function taskItems(tasks: readonly WorkTask[]): WorkAgendaItem[] {
  const items: WorkAgendaItem[] = []
  for (const task of tasks) {
    const at = task.startAt ?? task.dueAt
    if (at == null) continue
    items.push({
      type: 'task',
      id: task.id,
      at,
      allDay: false,
      value: task,
    })
  }
  return items
}

function reminderItems(reminders: readonly WorkReminder[]): WorkAgendaItem[] {
  return reminders.map((reminder) => ({
    type: 'reminder',
    id: reminder.id,
    at: reminder.remindAt,
    allDay: false,
    value: reminder,
  }))
}

function eventItems(events: readonly WorkEvent[]): WorkAgendaItem[] {
  const items: WorkAgendaItem[] = []
  for (const event of events) {
    if (event.allDay && event.startDate) {
      items.push({
        type: 'event',
        id: event.id,
        at: null,
        allDay: true,
        value: event,
      })
      continue
    }
    if (event.startAt == null) continue
    items.push({
      type: 'event',
      id: event.id,
      at: event.startAt,
      allDay: false,
      value: event,
    })
  }
  return items
}

function itemsOf(
  tasks: readonly WorkTask[],
  reminders: readonly WorkReminder[],
  events: readonly WorkEvent[]
): WorkAgendaItem[] {
  return [
    ...taskItems(tasks),
    ...reminderItems(reminders),
    ...eventItems(events),
  ].sort(compareItems)
}

function timeLabel(item: WorkAgendaItem): string {
  if (item.allDay || item.at == null) return 'All day'
  return new Date(item.at * 1000).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })
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
    return (
      <div className={cn('text-muted-foreground text-sm', className)}>
        {empty}
      </div>
    )

  return (
    <ol className={cn('space-y-3', className)}>
      {items.map((item) => (
        <li key={`${item.type}:${item.id}`}>
          {renderItem ? (
            renderItem(item)
          ) : (
            <div className="flex items-baseline gap-3">
              <time className="text-muted-foreground w-20 shrink-0 text-xs">
                {timeLabel(item)}
              </time>
              <span className="text-sm">{item.value.title}</span>
            </div>
          )}
        </li>
      ))}
    </ol>
  )
}
