'use client'

import { AppError, type AppErrorValue } from '@876/ui/app-error'
import { Badge } from '@876/ui/badge'
import { Button } from '@876/ui/button'
import { Checkbox } from '@876/ui/checkbox'
import { Calendar, PlusIcon, TrashIcon } from '@876/ui/icons'
import { Input } from '@876/ui/input'
import { useRouter } from 'next/navigation'
import { useMemo, useState, useTransition } from 'react'

import { client } from '@/lib/client'
import type { CrmRequestEvent } from '@/types/crm'

type Draft = {
  title: string
  allDay: boolean
  start: string
  end: string
  startDate: string
  endDate: string
}

function emptyDraft(): Draft {
  return {
    title: '',
    allDay: false,
    start: '',
    end: '',
    startDate: '',
    endDate: '',
  }
}

function unix(value: string) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : Math.floor(date.getTime() / 1000)
}

function formatEvent(event: CrmRequestEvent) {
  if (event.allDay) {
    if (!event.startDate) return 'All day'
    return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(
      new Date(`${event.startDate}T00:00:00`)
    )
  }
  if (event.startAt == null) return 'Scheduled'
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(event.startAt * 1000))
}

export function RequestEventsSection({
  requestId,
  events,
}: {
  requestId: string
  events: CrmRequestEvent[]
}) {
  const router = useRouter()
  const [draft, setDraft] = useState<Draft>(emptyDraft)
  const [expanded, setExpanded] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<AppErrorValue | null>(null)
  const [isPending, startTransition] = useTransition()

  const ordered = useMemo(
    () =>
      [...events].sort((left, right) => {
        const leftAt = left.startAt ?? Number.MAX_SAFE_INTEGER
        const rightAt = right.startAt ?? Number.MAX_SAFE_INTEGER
        if (leftAt !== rightAt) return leftAt - rightAt
        return (left.startDate ?? '').localeCompare(right.startDate ?? '')
      }),
    [events]
  )

  async function createEvent(event: React.FormEvent) {
    event.preventDefault()
    const title = draft.title.trim()
    if (!title || busyId || isPending) return

    setError(null)
    setBusyId('new')

    const result = draft.allDay
      ? draft.startDate && draft.endDate
        ? await client.requestEvents.create(requestId, {
            title,
            allDay: true,
            startDate: draft.startDate,
            endDate: draft.endDate,
            calendarTimeZone:
              Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Jamaica',
          })
        : null
      : unix(draft.start) != null && unix(draft.end) != null
        ? await client.requestEvents.create(requestId, {
            title,
            allDay: false,
            startAt: unix(draft.start)!,
            endAt: unix(draft.end)!,
            timeZone:
              Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Jamaica',
          })
        : null

    setBusyId(null)
    if (!result) {
      setError({ code: 'crm/invalid-body', message: 'Choose a valid start and end.' })
      return
    }
    if (result.error) {
      setError(result.error)
      return
    }

    setDraft(emptyDraft())
    setExpanded(false)
    startTransition(() => router.refresh())
  }

  async function deleteEvent(eventId: string) {
    setError(null)
    setBusyId(eventId)
    const result = await client.requestEvents.delete(requestId, eventId)
    setBusyId(null)
    if (result.error) {
      setError(result.error)
      return
    }
    startTransition(() => router.refresh())
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Calendar className="text-muted-foreground size-4" aria-hidden="true" />
        <h2 className="876-section-title">Schedule</h2>
        <Badge variant="secondary" className="px-1.5 tabular-nums">
          {events.length}
        </Badge>
      </div>

      {error ? (
        <AppError
          title="Schedule change could not be saved"
          error={error}
          variant="form"
        />
      ) : null}

      {ordered.length === 0 ? (
        <p className="border-border/60 bg-muted/20 text-muted-foreground rounded-lg border border-dashed px-4 py-8 text-center text-sm">
          No events scheduled for this request.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {ordered.map((event) => (
            <li
              key={event.id}
              className="876-card flex items-start justify-between gap-4 p-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{event.title}</p>
                <p className="text-muted-foreground mt-1 text-xs">
                  {formatEvent(event)}
                  {event.location ? ` · ${event.location}` : ''}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                disabled={busyId === event.id || isPending}
                aria-label={`Delete ${event.title}`}
                onClick={() => deleteEvent(event.id)}
              >
                <TrashIcon className="size-4" aria-hidden="true" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={createEvent} className="876-card flex flex-col gap-3 p-4">
        <div className="flex items-center gap-2">
          <Input
            value={draft.title}
            onChange={(event) =>
              setDraft((current) => ({ ...current, title: event.target.value }))
            }
            onFocus={() => setExpanded(true)}
            placeholder="Schedule an event…"
            maxLength={240}
          />
          {!expanded ? (
            <Button type="button" variant="ghost" size="icon-sm" onClick={() => setExpanded(true)}>
              <PlusIcon className="size-4" aria-hidden="true" />
              <span className="sr-only">Expand event composer</span>
            </Button>
          ) : null}
        </div>

        {expanded ? (
          <>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={draft.allDay}
                onCheckedChange={(checked) =>
                  setDraft((current) => ({ ...current, allDay: checked === true }))
                }
              />
              All day
            </label>

            {draft.allDay ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <Input
                  type="date"
                  aria-label="Start date"
                  value={draft.startDate}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, startDate: event.target.value }))
                  }
                />
                <Input
                  type="date"
                  aria-label="End date"
                  value={draft.endDate}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, endDate: event.target.value }))
                  }
                />
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                <Input
                  type="datetime-local"
                  aria-label="Start time"
                  value={draft.start}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, start: event.target.value }))
                  }
                />
                <Input
                  type="datetime-local"
                  aria-label="End time"
                  value={draft.end}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, end: event.target.value }))
                  }
                />
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setDraft(emptyDraft())
                  setExpanded(false)
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={busyId === 'new' || isPending}>
                Schedule
              </Button>
            </div>
          </>
        ) : null}
      </form>
    </section>
  )
}
