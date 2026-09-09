import type {
  WorkCalendar,
  WorkEvent,
  WorkMyWork,
  WorkReminder,
  WorkTask,
} from '@876/work'

import { cn } from '@876/core/utils'

import { WorkAgenda } from './agenda'
import { WorkCalendarList } from './calendar-list'

export type WorkCalendarView = 'day' | 'week' | 'month'

export type WorkCalendarSurfaceProps = {
  work: WorkMyWork
  calendars: readonly WorkCalendar[]
  view: WorkCalendarView
  anchorDate: Date
  activeCalendarId: string | null
  onChangeView: (view: WorkCalendarView) => void
  onNavigate: (direction: 'previous' | 'today' | 'next') => void
  onSelectDate: (date: Date) => void
  onSelectCalendar: (calendarId: string | null) => void
  className?: string
}

export type WorkCalendarItem = {
  id: string
  type: 'event' | 'task' | 'reminder'
  title: string
  at: number | null
  allDay: boolean
}

export function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

export function addLocalDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days)
}

export function workCalendarDateKey(date: Date): string {
  const year = String(date.getFullYear()).padStart(4, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function timestampDateKey(value: number): string {
  return workCalendarDateKey(new Date(value * 1000))
}

export function workEventOccursOnDay(event: WorkEvent, day: Date): boolean {
  const key = workCalendarDateKey(day)
  if (event.allDay && event.startDate && event.endDate)
    return key >= event.startDate && key < event.endDate
  if (event.startAt == null || event.endAt == null) return false

  const from = Math.floor(startOfLocalDay(day).getTime() / 1000)
  const to = Math.floor(addLocalDays(day, 1).getTime() / 1000)
  return event.startAt < to && event.endAt > from
}

export function workTaskOccursOnDay(task: WorkTask, day: Date): boolean {
  if (task.status === 'DONE' || task.status === 'CANCELLED') return false
  const at = task.startAt ?? task.dueAt
  return at != null && timestampDateKey(at) === workCalendarDateKey(day)
}

export function workReminderOccursOnDay(
  reminder: WorkReminder,
  day: Date
): boolean {
  return (
    reminder.status === 'SCHEDULED' &&
    timestampDateKey(reminder.remindAt) === workCalendarDateKey(day)
  )
}

export function workEventsForDay(
  work: WorkMyWork,
  day: Date,
  activeCalendarId: string | null
): WorkEvent[] {
  return work.events.filter(
    (event) =>
      (!activeCalendarId || event.calendarId === activeCalendarId) &&
      workEventOccursOnDay(event, day)
  )
}

export function workCalendarItemsForDay(
  work: WorkMyWork,
  day: Date,
  activeCalendarId: string | null
): WorkCalendarItem[] {
  const events: WorkCalendarItem[] = workEventsForDay(
    work,
    day,
    activeCalendarId
  ).map((event) => ({
    id: event.id,
    type: 'event',
    title: event.title,
    at: event.allDay ? null : event.startAt,
    allDay: event.allDay,
  }))
  const tasks: WorkCalendarItem[] = work.tasks
    .filter((task) => workTaskOccursOnDay(task, day))
    .map((task) => ({
      id: task.id,
      type: 'task',
      title: task.title,
      at: task.startAt ?? task.dueAt,
      allDay: false,
    }))
  const reminders: WorkCalendarItem[] = work.reminders
    .filter((reminder) => workReminderOccursOnDay(reminder, day))
    .map((reminder) => ({
      id: reminder.id,
      type: 'reminder',
      title: reminder.title,
      at: reminder.remindAt,
      allDay: false,
    }))

  return [...events, ...tasks, ...reminders].sort((left, right) => {
    if (left.allDay !== right.allDay) return left.allDay ? -1 : 1
    if (left.at == null) return -1
    if (right.at == null) return 1
    return left.at - right.at || left.id.localeCompare(right.id)
  })
}

function itemTime(item: WorkCalendarItem): string {
  if (item.allDay || item.at == null) return 'All day'
  return new Date(item.at * 1000).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  })
}

function itemKind(item: WorkCalendarItem): string {
  if (item.type === 'event') return 'Event'
  if (item.type === 'task') return 'Task'
  return 'Reminder'
}

function DayView({
  work,
  date,
  activeCalendarId,
}: {
  work: WorkMyWork
  date: Date
  activeCalendarId: string | null
}) {
  const tasks = work.tasks.filter((task) => workTaskOccursOnDay(task, date))
  const reminders = work.reminders.filter((reminder) =>
    workReminderOccursOnDay(reminder, date)
  )
  const events = workEventsForDay(work, date, activeCalendarId)

  return (
    <div className="p-4">
      <p className="mb-3 text-sm font-semibold">
        {date.toLocaleDateString([], {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
        })}
      </p>
      <WorkAgenda
        tasks={tasks}
        reminders={reminders}
        events={events}
        empty="Nothing scheduled for this day."
      />
    </div>
  )
}

function WeekView({
  work,
  date,
  activeCalendarId,
  onSelectDate,
}: {
  work: WorkMyWork
  date: Date
  activeCalendarId: string | null
  onSelectDate: (date: Date) => void
}) {
  const start = addLocalDays(
    startOfLocalDay(date),
    -startOfLocalDay(date).getDay()
  )
  const days = Array.from({ length: 7 }, (_, index) =>
    addLocalDays(start, index)
  )

  return (
    <div className="space-y-2 p-3">
      {days.map((day) => {
        const items = workCalendarItemsForDay(work, day, activeCalendarId)
        const selected = workCalendarDateKey(day) === workCalendarDateKey(date)
        return (
          <section
            key={workCalendarDateKey(day)}
            className={cn(
              'border-876-surface-border rounded-xl border p-3',
              selected && 'bg-muted/40'
            )}
            aria-label={day.toLocaleDateString()}
          >
            <button
              type="button"
              onClick={() => onSelectDate(day)}
              className="focus-visible:ring-ring mb-2 flex w-full items-baseline justify-between rounded-md text-left focus-visible:ring-2 focus-visible:outline-none"
            >
              <span className="text-sm font-semibold">
                {day.toLocaleDateString([], { weekday: 'long' })}
              </span>
              <span className="text-muted-foreground text-xs">
                {day.toLocaleDateString([], { month: 'short', day: 'numeric' })}
              </span>
            </button>
            {items.length === 0 ? (
              <p className="text-muted-foreground text-xs">Free</p>
            ) : (
              <div className="space-y-1.5">
                {items.map((item) => (
                  <div
                    key={`${item.type}:${item.id}`}
                    className="bg-muted rounded-md p-2"
                  >
                    <p className="text-[10px] font-medium uppercase">
                      {itemKind(item)} · {itemTime(item)}
                    </p>
                    <p className="mt-0.5 truncate text-xs">{item.title}</p>
                  </div>
                ))}
              </div>
            )}
          </section>
        )
      })}
    </div>
  )
}

function MonthView({
  work,
  date,
  activeCalendarId,
  onSelectDate,
}: {
  work: WorkMyWork
  date: Date
  activeCalendarId: string | null
  onSelectDate: (date: Date) => void
}) {
  const first = new Date(date.getFullYear(), date.getMonth(), 1)
  const gridStart = addLocalDays(first, -first.getDay())
  const days = Array.from({ length: 42 }, (_, index) =>
    addLocalDays(gridStart, index)
  )

  return (
    <div className="p-3">
      <div className="grid grid-cols-7 gap-1" aria-label="Month calendar">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
          <div
            key={`${day}:${index}`}
            className="text-muted-foreground py-1 text-center text-[10px] font-medium"
          >
            {day}
          </div>
        ))}
        {days.map((day) => {
          const items = workCalendarItemsForDay(work, day, activeCalendarId)
          const inMonth = day.getMonth() === date.getMonth()
          const selected =
            workCalendarDateKey(day) === workCalendarDateKey(date)
          return (
            <button
              key={workCalendarDateKey(day)}
              type="button"
              onClick={() => onSelectDate(day)}
              aria-pressed={selected}
              aria-label={day.toLocaleDateString()}
              className={cn(
                'border-876-surface-border focus-visible:ring-ring min-h-12 rounded-lg border p-1 text-center focus-visible:ring-2 focus-visible:outline-none',
                selected && 'bg-muted',
                !inMonth && 'text-muted-foreground opacity-60'
              )}
            >
              <span className="block text-xs font-medium">{day.getDate()}</span>
              {items.length > 0 ? (
                <span className="text-muted-foreground mt-0.5 block text-[9px] tabular-nums">
                  {items.length} {items.length === 1 ? 'item' : 'items'}
                </span>
              ) : null}
            </button>
          )
        })}
      </div>
      <div className="border-876-surface-border mt-3 border-t">
        <DayView work={work} date={date} activeCalendarId={activeCalendarId} />
      </div>
    </div>
  )
}

export function WorkCalendarSurface({
  work,
  calendars,
  view,
  anchorDate,
  activeCalendarId,
  onChangeView,
  onNavigate,
  onSelectDate,
  onSelectCalendar,
  className,
}: WorkCalendarSurfaceProps) {
  return (
    <section className={cn('min-w-0', className)} aria-label="Calendar">
      <div className="border-876-surface-border flex flex-wrap items-center justify-between gap-2 border-b p-3">
        <div className="flex flex-wrap gap-1">
          <button
            type="button"
            onClick={() => onNavigate('previous')}
            className="hover:bg-muted focus-visible:ring-ring rounded-lg px-2.5 py-1.5 text-xs font-medium focus-visible:ring-2 focus-visible:outline-none"
          >
            Previous
          </button>
          <button
            type="button"
            onClick={() => onNavigate('today')}
            className="hover:bg-muted focus-visible:ring-ring rounded-lg px-2.5 py-1.5 text-xs font-medium focus-visible:ring-2 focus-visible:outline-none"
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => onNavigate('next')}
            className="hover:bg-muted focus-visible:ring-ring rounded-lg px-2.5 py-1.5 text-xs font-medium focus-visible:ring-2 focus-visible:outline-none"
          >
            Next
          </button>
        </div>
        <div className="flex gap-1" role="group" aria-label="Calendar view">
          {(['day', 'week', 'month'] as const).map((item) => (
            <button
              key={item}
              type="button"
              aria-pressed={view === item}
              onClick={() => onChangeView(item)}
              className="aria-pressed:bg-muted focus-visible:ring-ring rounded-lg px-2.5 py-1.5 text-xs font-medium capitalize focus-visible:ring-2 focus-visible:outline-none"
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      <details className="border-876-surface-border border-b px-3 py-2">
        <summary className="focus-visible:ring-ring cursor-pointer list-none rounded-md text-xs font-medium focus-visible:ring-2 focus-visible:outline-none">
          Calendars
          {activeCalendarId ? ' · filtered' : ' · all visible'}
        </summary>
        <div className="mt-2">
          <button
            type="button"
            aria-pressed={activeCalendarId === null}
            onClick={() => onSelectCalendar(null)}
            className="hover:bg-muted focus-visible:ring-ring mb-1 w-full rounded-md px-2 py-1.5 text-left text-sm focus-visible:ring-2 focus-visible:outline-none"
          >
            All visible calendars
          </button>
          <WorkCalendarList
            calendars={calendars}
            activeCalendarId={activeCalendarId}
            onSelect={(calendar) => onSelectCalendar(calendar.id)}
          />
        </div>
      </details>

      {view === 'day' ? (
        <DayView
          work={work}
          date={anchorDate}
          activeCalendarId={activeCalendarId}
        />
      ) : view === 'week' ? (
        <WeekView
          work={work}
          date={anchorDate}
          activeCalendarId={activeCalendarId}
          onSelectDate={onSelectDate}
        />
      ) : (
        <MonthView
          work={work}
          date={anchorDate}
          activeCalendarId={activeCalendarId}
          onSelectDate={onSelectDate}
        />
      )}
    </section>
  )
}
