import type {
  WorkCalendar,
  WorkCalendarSubscription,
  WorkCalendarVisibility,
  WorkTaskList,
} from '@876/work'
import type { FormEvent } from 'react'

import { cn } from '@876/core/utils'

export type WorkTaskListDraft = {
  name: string
  description?: string | null
  sortOrder?: number
}

export type WorkCalendarDraft = {
  name: string
  description?: string | null
  timeZone: string
  visibility?: WorkCalendarVisibility
}

export type WorkSubscriptionEdit = {
  color?: string | null
  isVisible?: boolean
  defaultReminderMinutes?: number[]
}

export type WorkManageProps = {
  taskLists: readonly WorkTaskList[]
  calendars: readonly WorkCalendar[]
  activeCalendarId: string | null
  subscription?: WorkCalendarSubscription | null
  pending?: boolean
  canManageTaskLists?: boolean
  canManageCalendars?: boolean
  onSelectCalendar: (calendarId: string | null) => void
  onCreateTaskList?: (input: WorkTaskListDraft) => boolean | Promise<boolean>
  onUpdateTaskList?: (
    list: WorkTaskList,
    input: { name: string; description?: string | null }
  ) => void | Promise<void>
  onCreateCalendar?: (input: WorkCalendarDraft) => boolean | Promise<boolean>
  onUpdateCalendar?: (
    calendar: WorkCalendar,
    input: {
      name: string
      description?: string | null
      visibility: WorkCalendarVisibility
    }
  ) => void | Promise<void>
  onUpdateSubscription?: (
    subscription: WorkCalendarSubscription,
    input: WorkSubscriptionEdit
  ) => void | Promise<void>
  className?: string
}

function TaskListRow({
  list,
  pending,
  onUpdate,
}: {
  list: WorkTaskList
  pending: boolean
  onUpdate?: WorkManageProps['onUpdateTaskList']
}) {
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!onUpdate) return
    const data = new FormData(event.currentTarget)
    const name = String(data.get('name') ?? '').trim()
    if (!name) return
    await onUpdate(list, {
      name,
      description: String(data.get('description') ?? '').trim() || null,
    })
  }

  return (
    <details className="border-876-surface-border rounded-lg border p-2">
      <summary className="focus-visible:ring-ring cursor-pointer list-none rounded text-xs font-medium focus-visible:ring-2 focus-visible:outline-none">
        {list.name}
      </summary>
      {onUpdate ? (
        <form onSubmit={submit} className="mt-2 space-y-2 border-t pt-2">
          <input
            name="name"
            defaultValue={list.name}
            required
            maxLength={240}
            disabled={pending}
            aria-label={`Name for ${list.name}`}
            className="border-876-surface-border bg-background w-full rounded-lg border px-2 py-1.5 text-xs"
          />
          <textarea
            name="description"
            defaultValue={list.description ?? ''}
            maxLength={10_000}
            disabled={pending}
            aria-label={`Description for ${list.name}`}
            className="border-876-surface-border bg-background w-full rounded-lg border px-2 py-1.5 text-xs"
          />
          <button
            type="submit"
            disabled={pending}
            className="bg-primary text-primary-foreground rounded-lg px-2.5 py-1.5 text-xs font-medium disabled:opacity-60"
          >
            Save list
          </button>
        </form>
      ) : null}
    </details>
  )
}

export function WorkManage({
  taskLists,
  calendars,
  activeCalendarId,
  subscription,
  pending = false,
  canManageTaskLists = false,
  canManageCalendars = false,
  onSelectCalendar,
  onCreateTaskList,
  onUpdateTaskList,
  onCreateCalendar,
  onUpdateCalendar,
  onUpdateSubscription,
  className,
}: WorkManageProps) {
  const activeCalendar =
    calendars.find((calendar) => calendar.id === activeCalendarId) ?? null

  async function createList(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!onCreateTaskList) return
    const form = event.currentTarget
    const data = new FormData(form)
    const name = String(data.get('name') ?? '').trim()
    if (!name) return
    const created = await onCreateTaskList({
      name,
      description: String(data.get('description') ?? '').trim() || null,
    })
    if (created) form.reset()
  }

  async function createCalendar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!onCreateCalendar) return
    const form = event.currentTarget
    const data = new FormData(form)
    const name = String(data.get('name') ?? '').trim()
    const timeZone = String(data.get('timeZone') ?? '').trim()
    const visibility = String(data.get('visibility')) as WorkCalendarVisibility
    if (!name || !timeZone) return
    const created = await onCreateCalendar({
      name,
      description: String(data.get('description') ?? '').trim() || null,
      timeZone,
      visibility,
    })
    if (created) form.reset()
  }

  async function updateCalendar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!activeCalendar || !onUpdateCalendar) return
    const data = new FormData(event.currentTarget)
    const name = String(data.get('name') ?? '').trim()
    const visibility = String(data.get('visibility')) as WorkCalendarVisibility
    if (!name) return
    await onUpdateCalendar(activeCalendar, {
      name,
      description: String(data.get('description') ?? '').trim() || null,
      visibility,
    })
  }

  async function updateSubscription(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!subscription || !onUpdateSubscription) return
    const data = new FormData(event.currentTarget)
    const reminders = String(data.get('defaultReminderMinutes') ?? '')
      .split(',')
      .map((value) => Number(value.trim()))
      .filter((value) => Number.isInteger(value) && value >= 0)
    await onUpdateSubscription(subscription, {
      color: String(data.get('color') ?? '').trim() || null,
      isVisible: data.get('isVisible') === 'on',
      defaultReminderMinutes: reminders,
    })
  }

  return (
    <section
      className={cn('space-y-4 p-4', className)}
      aria-label="Manage Work"
    >
      <header>
        <p className="text-base font-semibold">Manage</p>
        <p className="text-muted-foreground mt-1 text-xs">
          Task lists, calendars, and your calendar preferences.
        </p>
      </header>

      <section className="space-y-2" aria-labelledby="work-task-lists-heading">
        <p id="work-task-lists-heading" className="text-sm font-medium">
          Task lists
        </p>
        {taskLists.length === 0 ? (
          <p className="text-muted-foreground text-xs">No task lists.</p>
        ) : (
          taskLists.map((list) => (
            <TaskListRow
              key={list.id}
              list={list}
              pending={pending}
              onUpdate={canManageTaskLists ? onUpdateTaskList : undefined}
            />
          ))
        )}
        {canManageTaskLists && onCreateTaskList ? (
          <form onSubmit={createList} className="space-y-2 pt-1">
            <input
              name="name"
              required
              placeholder="New task list"
              disabled={pending}
              className="border-876-surface-border bg-background w-full rounded-lg border px-2.5 py-2 text-sm"
            />
            <textarea
              name="description"
              placeholder="Description (optional)"
              disabled={pending}
              className="border-876-surface-border bg-background w-full rounded-lg border px-2.5 py-2 text-sm"
            />
            <button
              type="submit"
              disabled={pending}
              className="bg-primary text-primary-foreground rounded-lg px-3 py-2 text-xs font-medium disabled:opacity-60"
            >
              Create list
            </button>
          </form>
        ) : null}
      </section>

      <section
        className="space-y-2 border-t pt-4"
        aria-labelledby="work-calendars-heading"
      >
        <p id="work-calendars-heading" className="text-sm font-medium">
          Calendars
        </p>
        <select
          value={activeCalendarId ?? ''}
          onChange={(event) => onSelectCalendar(event.target.value || null)}
          aria-label="Calendar to manage"
          className="border-876-surface-border bg-background w-full rounded-lg border px-2.5 py-2 text-sm"
        >
          <option value="">Select a calendar</option>
          {calendars.map((calendar) => (
            <option key={calendar.id} value={calendar.id}>
              {calendar.name}
              {calendar.isPrimary ? ' (primary)' : ''}
            </option>
          ))}
        </select>

        {activeCalendar ? (
          <form onSubmit={updateCalendar} className="space-y-2">
            <input
              name="name"
              defaultValue={activeCalendar.name}
              required
              disabled={pending || !canManageCalendars}
              aria-label="Calendar name"
              className="border-876-surface-border bg-background w-full rounded-lg border px-2.5 py-2 text-sm"
            />
            <textarea
              name="description"
              defaultValue={activeCalendar.description ?? ''}
              disabled={pending || !canManageCalendars}
              aria-label="Calendar description"
              className="border-876-surface-border bg-background w-full rounded-lg border px-2.5 py-2 text-sm"
            />
            <select
              name="visibility"
              defaultValue={activeCalendar.visibility}
              disabled={pending || !canManageCalendars}
              aria-label="Calendar visibility"
              className="border-876-surface-border bg-background w-full rounded-lg border px-2.5 py-2 text-sm"
            >
              <option value="PRIVATE">Private</option>
              <option value="ORGANIZATION">Organization</option>
            </select>
            {canManageCalendars && onUpdateCalendar ? (
              <button
                type="submit"
                disabled={pending}
                className="bg-primary text-primary-foreground rounded-lg px-3 py-2 text-xs font-medium disabled:opacity-60"
              >
                Save calendar
              </button>
            ) : null}
          </form>
        ) : null}

        {subscription ? (
          <form
            onSubmit={updateSubscription}
            className="space-y-2 rounded-lg border p-2"
          >
            <p className="text-xs font-medium">Your subscription</p>
            <label className="block text-xs">
              Color
              <input
                name="color"
                defaultValue={subscription.color ?? ''}
                disabled={pending || !canManageCalendars}
                className="border-876-surface-border bg-background mt-1 w-full rounded-lg border px-2 py-1.5 text-xs"
              />
            </label>
            <label className="flex items-center gap-2 text-xs">
              <input
                name="isVisible"
                type="checkbox"
                defaultChecked={subscription.isVisible}
                disabled={pending || !canManageCalendars}
              />
              Show this calendar
            </label>
            <label className="block text-xs">
              Default reminder minutes
              <input
                name="defaultReminderMinutes"
                defaultValue={subscription.defaultReminderMinutes.join(', ')}
                disabled={pending || !canManageCalendars}
                placeholder="10, 30"
                className="border-876-surface-border bg-background mt-1 w-full rounded-lg border px-2 py-1.5 text-xs"
              />
            </label>
            {canManageCalendars && onUpdateSubscription ? (
              <button
                type="submit"
                disabled={pending}
                className="border-876-surface-border rounded-lg border px-2.5 py-1.5 text-xs font-medium disabled:opacity-60"
              >
                Save preferences
              </button>
            ) : null}
          </form>
        ) : null}

        {canManageCalendars && onCreateCalendar ? (
          <details className="border-876-surface-border rounded-lg border p-2">
            <summary className="cursor-pointer text-xs font-medium">
              Create calendar
            </summary>
            <form
              onSubmit={createCalendar}
              className="mt-2 space-y-2 border-t pt-2"
            >
              <input
                name="name"
                required
                placeholder="Calendar name"
                disabled={pending}
                className="border-876-surface-border bg-background w-full rounded-lg border px-2.5 py-2 text-sm"
              />
              <textarea
                name="description"
                placeholder="Description (optional)"
                disabled={pending}
                className="border-876-surface-border bg-background w-full rounded-lg border px-2.5 py-2 text-sm"
              />
              <input
                name="timeZone"
                defaultValue={
                  Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
                }
                required
                disabled={pending}
                aria-label="Calendar time zone"
                className="border-876-surface-border bg-background w-full rounded-lg border px-2.5 py-2 text-sm"
              />
              <select
                name="visibility"
                defaultValue="PRIVATE"
                disabled={pending}
                aria-label="New calendar visibility"
                className="border-876-surface-border bg-background w-full rounded-lg border px-2.5 py-2 text-sm"
              >
                <option value="PRIVATE">Private</option>
                <option value="ORGANIZATION">Organization</option>
              </select>
              <button
                type="submit"
                disabled={pending}
                className="bg-primary text-primary-foreground rounded-lg px-3 py-2 text-xs font-medium disabled:opacity-60"
              >
                Create calendar
              </button>
            </form>
          </details>
        ) : null}
      </section>
    </section>
  )
}
