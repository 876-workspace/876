'use client'

import { useMemo, useState, type FormEvent } from 'react'
import {
  workTaskImportanceSchema,
  type WorkCalendar,
  type WorkTaskImportance,
  type WorkTaskList,
} from '@876/work'

import { cn } from '@876/core/utils'

export type WorkCreateTaskDraft = {
  title: string
  listId?: string
  description?: string | null
  importance?: WorkTaskImportance
  due?: { at: number; timeZone: string } | null
}

export type WorkCreateEventDraft =
  | {
      title: string
      calendarId: string
      allDay: false
      startAt: number
      endAt: number
      timeZone: string
      description?: string | null
      location?: string | null
    }
  | {
      title: string
      calendarId: string
      allDay: true
      startDate: string
      endDate: string
      description?: string | null
      location?: string | null
    }

export type WorkCreateReminderDraft = {
  title: string
  note?: string | null
  remindAt: number
  timeZone?: string | null
}

export type WorkCreateProps = {
  taskLists?: readonly WorkTaskList[]
  calendars?: readonly WorkCalendar[]
  creating?: boolean
  onCreateTask?: (input: WorkCreateTaskDraft) => boolean | Promise<boolean>
  onCreateEvent?: (input: WorkCreateEventDraft) => boolean | Promise<boolean>
  onCreateReminder?: (
    input: WorkCreateReminderDraft
  ) => boolean | Promise<boolean>
  className?: string
}

type WorkCreateMode = 'event' | 'task' | 'reminder'

function browserTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
}

function timestampFromLocal(value: FormDataEntryValue | null): number | null {
  if (typeof value !== 'string' || !value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return Math.floor(date.getTime() / 1000)
}

function formText(data: FormData, key: string): string | null {
  const value = data.get(key)
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed || null
}

function TaskCreateForm({
  taskLists,
  creating,
  onCreateTask,
}: {
  taskLists: readonly WorkTaskList[]
  creating: boolean
  onCreateTask: NonNullable<WorkCreateProps['onCreateTask']>
}) {
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const data = new FormData(form)
    const title = formText(data, 'title')
    const importance = workTaskImportanceSchema.safeParse(data.get('importance'))
    if (!title || !importance.success) return

    const dueAt = timestampFromLocal(data.get('due'))
    const created = await onCreateTask({
      title,
      ...(formText(data, 'listId') ? { listId: formText(data, 'listId')! } : {}),
      description: formText(data, 'description'),
      importance: importance.data,
      due:
        dueAt == null
          ? null
          : { at: dueAt, timeZone: browserTimeZone() },
    })
    if (created) form.reset()
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <label className="block text-xs font-medium">
        Title
        <input
          name="title"
          maxLength={240}
          required
          disabled={creating}
          className="border-876-surface-border bg-background mt-1 w-full rounded-lg border px-3 py-2 text-sm"
        />
      </label>
      {taskLists.length > 0 ? (
        <label className="block text-xs font-medium">
          List
          <select
            name="listId"
            disabled={creating}
            className="border-876-surface-border bg-background mt-1 w-full rounded-lg border px-3 py-2 text-sm"
          >
            <option value="">Default list</option>
            {taskLists.map((list) => (
              <option key={list.id} value={list.id}>
                {list.name}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      <label className="block text-xs font-medium">
        Description
        <textarea
          name="description"
          maxLength={10_000}
          rows={2}
          disabled={creating}
          className="border-876-surface-border bg-background mt-1 w-full resize-y rounded-lg border px-3 py-2 text-sm"
        />
      </label>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="block text-xs font-medium">
          Importance
          <select
            name="importance"
            defaultValue="NORMAL"
            disabled={creating}
            className="border-876-surface-border bg-background mt-1 w-full rounded-lg border px-3 py-2 text-sm"
          >
            <option value="LOW">Low</option>
            <option value="NORMAL">Normal</option>
            <option value="HIGH">High</option>
            <option value="URGENT">Urgent</option>
          </select>
        </label>
        <label className="block text-xs font-medium">
          Due
          <input
            name="due"
            type="datetime-local"
            disabled={creating}
            className="border-876-surface-border bg-background mt-1 w-full rounded-lg border px-3 py-2 text-sm"
          />
        </label>
      </div>
      <CreateSubmitButton creating={creating} label="Create task" />
    </form>
  )
}

function EventCreateForm({
  calendars,
  creating,
  onCreateEvent,
}: {
  calendars: readonly WorkCalendar[]
  creating: boolean
  onCreateEvent: NonNullable<WorkCreateProps['onCreateEvent']>
}) {
  const [allDay, setAllDay] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const data = new FormData(form)
    const title = formText(data, 'title')
    const calendarId = formText(data, 'calendarId')
    if (!title || !calendarId) return

    const description = formText(data, 'description')
    const location = formText(data, 'location')
    let draft: WorkCreateEventDraft | null = null

    if (allDay) {
      const startDate = formText(data, 'startDate')
      const endDate = formText(data, 'endDate')
      if (!startDate || !endDate || endDate <= startDate) return
      draft = {
        title,
        calendarId,
        allDay: true,
        startDate,
        endDate,
        description,
        location,
      }
    } else {
      const startAt = timestampFromLocal(data.get('startAt'))
      const endAt = timestampFromLocal(data.get('endAt'))
      if (startAt == null || endAt == null || endAt <= startAt) return
      draft = {
        title,
        calendarId,
        allDay: false,
        startAt,
        endAt,
        timeZone: browserTimeZone(),
        description,
        location,
      }
    }

    const created = await onCreateEvent(draft)
    if (created) {
      form.reset()
      setAllDay(false)
    }
  }

  if (calendars.length === 0)
    return (
      <p className="text-muted-foreground text-sm">
        No visible calendar is available for a new event.
      </p>
    )

  return (
    <form onSubmit={submit} className="space-y-3">
      <label className="block text-xs font-medium">
        Title
        <input
          name="title"
          maxLength={240}
          required
          disabled={creating}
          className="border-876-surface-border bg-background mt-1 w-full rounded-lg border px-3 py-2 text-sm"
        />
      </label>
      <label className="block text-xs font-medium">
        Calendar
        <select
          name="calendarId"
          required
          disabled={creating}
          className="border-876-surface-border bg-background mt-1 w-full rounded-lg border px-3 py-2 text-sm"
        >
          {calendars.map((calendar) => (
            <option key={calendar.id} value={calendar.id}>
              {calendar.name}
            </option>
          ))}
        </select>
      </label>
      <label className="flex items-center gap-2 text-xs font-medium">
        <input
          type="checkbox"
          checked={allDay}
          disabled={creating}
          onChange={(event) => setAllDay(event.currentTarget.checked)}
        />
        All day
      </label>
      {allDay ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="block text-xs font-medium">
            Start date
            <input
              name="startDate"
              type="date"
              required
              disabled={creating}
              className="border-876-surface-border bg-background mt-1 w-full rounded-lg border px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-xs font-medium">
            End date
            <input
              name="endDate"
              type="date"
              required
              disabled={creating}
              className="border-876-surface-border bg-background mt-1 w-full rounded-lg border px-3 py-2 text-sm"
            />
          </label>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="block text-xs font-medium">
            Starts
            <input
              name="startAt"
              type="datetime-local"
              required
              disabled={creating}
              className="border-876-surface-border bg-background mt-1 w-full rounded-lg border px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-xs font-medium">
            Ends
            <input
              name="endAt"
              type="datetime-local"
              required
              disabled={creating}
              className="border-876-surface-border bg-background mt-1 w-full rounded-lg border px-3 py-2 text-sm"
            />
          </label>
        </div>
      )}
      <label className="block text-xs font-medium">
        Location
        <input
          name="location"
          maxLength={1000}
          disabled={creating}
          className="border-876-surface-border bg-background mt-1 w-full rounded-lg border px-3 py-2 text-sm"
        />
      </label>
      <label className="block text-xs font-medium">
        Description
        <textarea
          name="description"
          maxLength={10_000}
          rows={2}
          disabled={creating}
          className="border-876-surface-border bg-background mt-1 w-full resize-y rounded-lg border px-3 py-2 text-sm"
        />
      </label>
      <CreateSubmitButton creating={creating} label="Create event" />
    </form>
  )
}

function ReminderCreateForm({
  creating,
  onCreateReminder,
}: {
  creating: boolean
  onCreateReminder: NonNullable<WorkCreateProps['onCreateReminder']>
}) {
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const data = new FormData(form)
    const title = formText(data, 'title')
    const remindAt = timestampFromLocal(data.get('remindAt'))
    if (!title || remindAt == null) return

    const created = await onCreateReminder({
      title,
      note: formText(data, 'note'),
      remindAt,
      timeZone: browserTimeZone(),
    })
    if (created) form.reset()
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <label className="block text-xs font-medium">
        Title
        <input
          name="title"
          maxLength={240}
          required
          disabled={creating}
          className="border-876-surface-border bg-background mt-1 w-full rounded-lg border px-3 py-2 text-sm"
        />
      </label>
      <label className="block text-xs font-medium">
        Remind me
        <input
          name="remindAt"
          type="datetime-local"
          required
          disabled={creating}
          className="border-876-surface-border bg-background mt-1 w-full rounded-lg border px-3 py-2 text-sm"
        />
      </label>
      <label className="block text-xs font-medium">
        Note
        <textarea
          name="note"
          maxLength={10_000}
          rows={2}
          disabled={creating}
          className="border-876-surface-border bg-background mt-1 w-full resize-y rounded-lg border px-3 py-2 text-sm"
        />
      </label>
      <CreateSubmitButton creating={creating} label="Create reminder" />
    </form>
  )
}

function CreateSubmitButton({
  creating,
  label,
}: {
  creating: boolean
  label: string
}) {
  return (
    <button
      type="submit"
      disabled={creating}
      className="bg-primary text-primary-foreground focus-visible:ring-ring rounded-lg px-3 py-2 text-xs font-medium disabled:cursor-wait disabled:opacity-60 focus-visible:ring-2 focus-visible:outline-none"
    >
      {creating ? 'Creating…' : label}
    </button>
  )
}

export function WorkCreate({
  taskLists = [],
  calendars = [],
  creating = false,
  onCreateTask,
  onCreateEvent,
  onCreateReminder,
  className,
}: WorkCreateProps) {
  const modes = useMemo(
    () =>
      [
        onCreateEvent ? ('event' as const) : null,
        onCreateTask ? ('task' as const) : null,
        onCreateReminder ? ('reminder' as const) : null,
      ].filter((mode): mode is WorkCreateMode => mode !== null),
    [onCreateEvent, onCreateReminder, onCreateTask]
  )
  const [mode, setMode] = useState<WorkCreateMode>(modes[0] ?? 'task')
  const activeMode = modes.includes(mode) ? mode : modes[0]

  if (!activeMode)
    return (
      <section className={cn('p-4', className)} aria-label="Create Work">
        <p className="text-sm font-medium">Create</p>
        <p className="text-muted-foreground mt-1 text-xs">
          You do not have permission to create Work items.
        </p>
      </section>
    )

  return (
    <section className={cn('space-y-4 p-4', className)} aria-label="Create Work">
      <header>
        <p className="text-base font-semibold">Create</p>
        <p className="text-muted-foreground mt-1 text-xs">
          Add an event, task, or reminder to 876 Work.
        </p>
      </header>
      <div className="flex gap-1" role="group" aria-label="Work item type">
        {modes.map((item) => (
          <button
            key={item}
            type="button"
            aria-pressed={activeMode === item}
            disabled={creating}
            onClick={() => setMode(item)}
            className="border-876-surface-border aria-pressed:bg-muted focus-visible:ring-ring rounded-full border px-3 py-1.5 text-xs font-medium capitalize disabled:opacity-60 focus-visible:ring-2 focus-visible:outline-none"
          >
            {item}
          </button>
        ))}
      </div>

      {activeMode === 'event' && onCreateEvent ? (
        <EventCreateForm
          calendars={calendars}
          creating={creating}
          onCreateEvent={onCreateEvent}
        />
      ) : activeMode === 'task' && onCreateTask ? (
        <TaskCreateForm
          taskLists={taskLists}
          creating={creating}
          onCreateTask={onCreateTask}
        />
      ) : activeMode === 'reminder' && onCreateReminder ? (
        <ReminderCreateForm
          creating={creating}
          onCreateReminder={onCreateReminder}
        />
      ) : null}
    </section>
  )
}
