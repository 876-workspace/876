'use client'

import type { TimeEntry } from '@876/projects/contracts'
import { AppError, type AppErrorValue } from '@876/ui/app-error'
import { Button } from '@876/ui/button'
import { Checkbox } from '@876/ui/checkbox'
import { FormRow } from '@876/ui/form-row'
import { Input } from '@876/ui/input'
import { NativeSelect } from '@876/ui/native-select'
import { useRouter } from 'next/navigation'
import { useState, type FormEvent } from 'react'

import { timeClient } from '@/lib/client/time'

import {
  entryDateValue,
  entryTimeValue,
  entryTimestamps,
} from './time-entry-input'

import type { TimeEntryProjectOption } from '@/types/time'

export type { TimeEntryProjectOption }

type Props = {
  projects: readonly TimeEntryProjectOption[]
  defaultDate: string
  /** Where the page returns once the entry is saved: the list without `?entry=`. */
  closeHref: string
  projectId?: string | null
  entry?: TimeEntry | null
}

const RANGE_ERRORS: Record<'incomplete' | 'range', string> = {
  incomplete: 'Enter a date, a start time, and an end time.',
  range: 'Enter an end time after the start time.',
}

/**
 * Logs one entry by hand. The form is deliberately not a pair of timestamps
 * derived in the browser: it sends the two instants the user typed and the
 * service stores the duration it derives from them.
 */
export function TimeEntryForm({
  projects,
  defaultDate,
  closeHref,
  projectId = null,
  entry = null,
}: Props) {
  const router = useRouter()
  const editing = entry !== null
  const [selectedProjectId, setSelectedProjectId] = useState(
    projectId ?? entry?.projectId ?? projects[0]?.id ?? ''
  )
  const [date, setDate] = useState(
    entry ? entryDateValue(entry.startedAt) : defaultDate
  )
  const [start, setStart] = useState(
    entry ? entryTimeValue(entry.startedAt) : ''
  )
  const [end, setEnd] = useState(
    entry ? entryTimeValue(entry.endedAt ?? entry.startedAt) : ''
  )
  const [billable, setBillable] = useState(entry?.billable ?? false)
  const [note, setNote] = useState(entry?.note ?? '')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<AppErrorValue | null>(null)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending) return

    const timestamps = entryTimestamps(date, start, end)
    if (!timestamps.ok) {
      setError({
        code: `projects/time-entry-${timestamps.reason}`,
        message: RANGE_ERRORS[timestamps.reason],
      })
      return
    }

    if (!selectedProjectId) {
      setError({
        code: 'projects/time-entry-project-required',
        message: 'Choose a project to log against.',
      })
      return
    }

    setPending(true)
    setError(null)
    const body = {
      startedAt: timestamps.startedAt,
      endedAt: timestamps.endedAt,
      billable,
      note: note.trim() ? note.trim() : null,
    }
    const result = editing
      ? await timeClient.updateEntry(entry.id, body)
      : await timeClient.createEntry({ ...body, projectId: selectedProjectId })
    setPending(false)

    if (result.error || !result.data) {
      setError(
        result.error ?? {
          code: 'projects/time-entry-save-failed',
          message: 'The entry could not be saved.',
        }
      )
      return
    }

    if (editing) {
      router.replace(closeHref)
      return
    }

    setStart('')
    setEnd('')
    setNote('')
    router.refresh()
  }

  return (
    <section
      aria-label={editing ? 'Edit time entry' : 'Add time entry'}
      className="876-card space-y-4 p-5 sm:p-6"
    >
      <h2 className="text-base font-semibold">
        {editing ? 'Edit entry' : 'Add entry'}
      </h2>

      {error ? (
        <AppError
          title={
            editing ? 'The entry was not saved' : 'The entry was not logged'
          }
          error={error}
          variant="form"
        />
      ) : null}

      <form onSubmit={submit} className="space-y-3">
        {projectId ? null : (
          <FormRow label="Project" htmlFor="time-entry-project" required>
            <NativeSelect
              id="time-entry-project"
              value={selectedProjectId}
              onChange={(event) => setSelectedProjectId(event.target.value)}
              className="w-full"
            >
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </NativeSelect>
          </FormRow>
        )}

        <FormRow label="Date" htmlFor="time-entry-date" required>
          <Input
            id="time-entry-date"
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
          />
        </FormRow>

        <FormRow label="Start" htmlFor="time-entry-start" required>
          <Input
            id="time-entry-start"
            type="time"
            value={start}
            onChange={(event) => setStart(event.target.value)}
          />
        </FormRow>

        <FormRow label="End" htmlFor="time-entry-end" required>
          <Input
            id="time-entry-end"
            type="time"
            value={end}
            onChange={(event) => setEnd(event.target.value)}
          />
        </FormRow>

        <FormRow label="Note" htmlFor="time-entry-note">
          <Input
            id="time-entry-note"
            value={note}
            maxLength={2000}
            onChange={(event) => setNote(event.target.value)}
          />
        </FormRow>

        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={billable}
            onCheckedChange={(checked) => setBillable(checked === true)}
          />
          <span>Billable</span>
        </label>

        <div className="flex items-center gap-2 pt-1">
          {editing ? (
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => router.replace(closeHref)}
            >
              Cancel
            </Button>
          ) : null}
          <Button type="submit" variant="info" disabled={pending}>
            {pending ? 'Saving…' : editing ? 'Save changes' : 'Add'}
          </Button>
        </div>
      </form>
    </section>
  )
}
