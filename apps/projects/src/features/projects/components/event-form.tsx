'use client'

import type { EventKind, ProjectEvent } from '@876/projects/contracts'
import { AppError, type AppErrorValue } from '@876/ui/app-error'
import { Button } from '@876/ui/button'
import { FormRow } from '@876/ui/form-row'
import { Input } from '@876/ui/input'
import { NativeSelect } from '@876/ui/native-select'
import { Textarea } from '@876/ui/textarea'
import { useRouter } from 'next/navigation'
import { useMemo, useState, type FormEvent } from 'react'

import {
  buildRecurrenceInput,
  dateFieldTimestamp,
  dateFieldValue,
  dateTimeFieldTimestamp,
  dateTimeFieldValue,
  EMPTY_RECURRENCE_DRAFT,
  recurrenceDraftFromRule,
  WEEKDAY_OPTIONS,
} from '@/features/projects/event-input'
import type { RecurrenceDraft, RecurrenceEnds } from '@/types/events'
import { eventsClient } from '@/lib/client/events'

import type {
  EventFormOptions,
  EventMemberOption,
  EventWorkItemOption,
} from '@/types/events'

export type { EventFormOptions, EventMemberOption, EventWorkItemOption }

type Props =
  | { mode: 'create'; options: EventFormOptions; event?: never }
  | { mode: 'edit'; options: EventFormOptions; event: ProjectEvent }

/**
 * One form for a project event and for a meeting: a meeting is the same record
 * with a link and attendees, not a second kind of thing to maintain.
 */
export function EventForm(props: Props) {
  const router = useRouter()
  const editing = props.mode === 'edit'
  const event = editing ? props.event : null
  const { options } = props

  const [kind, setKind] = useState<EventKind>(
    event ? (event.kind === 'meeting' ? 'meeting' : 'event') : 'event'
  )
  const [title, setTitle] = useState(event?.title ?? '')
  const [description, setDescription] = useState(event?.description ?? '')
  const [projectId, setProjectId] = useState(event?.projectId ?? '')
  const [phaseId, setPhaseId] = useState(event?.milestoneId ?? '')
  const [workItemId, setWorkItemId] = useState(event?.issueId ?? '')
  const [allDay, setAllDay] = useState(event?.allDay ?? false)
  const [startsAt, setStartsAt] = useState(
    event
      ? event.allDay
        ? dateFieldValue(event.startsAt)
        : dateTimeFieldValue(event.startsAt)
      : ''
  )
  const [endsAt, setEndsAt] = useState(
    event?.endsAt
      ? event.allDay
        ? dateFieldValue(event.endsAt)
        : dateTimeFieldValue(event.endsAt)
      : ''
  )
  const [location, setLocation] = useState(event?.location ?? '')
  const [meetingUrl, setMeetingUrl] = useState(event?.meetingUrl ?? '')
  const [attendeeIds, setAttendeeIds] = useState<string[]>(
    event?.attendees.map((attendee) => attendee.userId) ?? []
  )
  const [attendeeToAdd, setAttendeeToAdd] = useState('')
  const [recurrence, setRecurrence] = useState<RecurrenceDraft>(
    event ? recurrenceDraftFromRule(event.recurrence) : EMPTY_RECURRENCE_DRAFT
  )
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<AppErrorValue | null>(null)

  const phases = useMemo(
    () => options.phases.filter((phase) => phase.projectId === projectId),
    [options.phases, projectId]
  )
  const workItems = options.workItems
  const selectableMembers = options.members.filter(
    (member) => !attendeeIds.includes(member.userId)
  )

  function toggleWeekday(day: number) {
    setRecurrence((current) => ({
      ...current,
      byWeekday: current.byWeekday.includes(day)
        ? current.byWeekday.filter((value) => value !== day)
        : [...current.byWeekday, day],
    }))
  }

  async function onSubmit(formEvent: FormEvent<HTMLFormElement>) {
    formEvent.preventDefault()
    if (pending) return

    const startsAtTimestamp = allDay
      ? dateFieldTimestamp(startsAt)
      : dateTimeFieldTimestamp(startsAt)
    const endsAtTimestamp = allDay
      ? dateFieldTimestamp(endsAt)
      : dateTimeFieldTimestamp(endsAt)

    if (!title.trim() || !startsAtTimestamp || (!editing && !projectId)) {
      setError({
        code: 'projects/event-incomplete',
        message: 'An event needs a title, a project and a start.',
      })
      return
    }
    if (endsAtTimestamp !== null && endsAtTimestamp < startsAtTimestamp) {
      setError({
        code: 'projects/event-invalid-dates',
        message: 'The event cannot end before it starts.',
      })
      return
    }

    setPending(true)
    setError(null)

    const fields = {
      milestoneId: phaseId || null,
      issueId: workItemId || null,
      kind,
      title: title.trim(),
      description: description.trim() || null,
      startsAt: startsAtTimestamp,
      endsAt: endsAtTimestamp,
      allDay,
      location: location.trim() || null,
      meetingUrl: meetingUrl.trim() || null,
      recurrence: buildRecurrenceInput(recurrence),
    }

    if (editing) {
      const result = await eventsClient.update(props.event.id, fields)
      if (result.error || !result.data) {
        setPending(false)
        setError(
          result.error ?? {
            code: 'projects/event-save-failed',
            message: 'The event could not be saved.',
          }
        )
        return
      }

      const existing = props.event.attendees.map((attendee) => attendee.userId)
      for (const userId of attendeeIds.filter((id) => !existing.includes(id))) {
        const added = await eventsClient.addAttendee(props.event.id, { userId })
        if (added.error) {
          setPending(false)
          setError(added.error)
          return
        }
      }
      for (const userId of existing.filter((id) => !attendeeIds.includes(id))) {
        const removed = await eventsClient.removeAttendee(
          props.event.id,
          userId
        )
        if (removed.error) {
          setPending(false)
          setError(removed.error)
          return
        }
      }

      setPending(false)
      router.push(`/calendar/events/${encodeURIComponent(props.event.id)}`)
      return
    }

    const created = await eventsClient.create({ projectId, ...fields })
    if (created.error || !created.data) {
      setPending(false)
      setError(
        created.error ?? {
          code: 'projects/event-save-failed',
          message: 'The event could not be saved.',
        }
      )
      return
    }

    for (const userId of attendeeIds) {
      const added = await eventsClient.addAttendee(created.data.id, { userId })
      if (added.error) {
        setPending(false)
        setError(added.error)
        return
      }
    }

    setPending(false)
    router.push(`/calendar/events/${encodeURIComponent(created.data.id)}`)
  }

  return (
    <form
      onSubmit={onSubmit}
      className="876-card max-w-3xl space-y-5 p-6"
      aria-label={editing ? 'Edit event' : 'New event'}
    >
      {error ? (
        <AppError title="The event could not be saved" error={error} />
      ) : null}

      <div className="grid gap-5 sm:grid-cols-2">
        <FormRow label="Kind" htmlFor="event-kind">
          <NativeSelect
            id="event-kind"
            value={kind}
            onChange={(selectEvent) =>
              setKind(
                selectEvent.target.value === 'meeting' ? 'meeting' : 'event'
              )
            }
            className="w-full"
          >
            <option value="event">Event</option>
            <option value="meeting">Meeting</option>
          </NativeSelect>
        </FormRow>
        <FormRow label="Project" htmlFor="event-project" required>
          <NativeSelect
            id="event-project"
            value={projectId}
            onChange={(selectEvent) => {
              setProjectId(selectEvent.target.value)
              setPhaseId('')
              setWorkItemId('')
            }}
            disabled={editing}
            className="w-full"
          >
            <option value="">Select a project</option>
            {options.projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </NativeSelect>
        </FormRow>
      </div>

      <FormRow label="Title" htmlFor="event-title" required>
        <Input
          id="event-title"
          value={title}
          onChange={(inputEvent) => setTitle(inputEvent.target.value)}
          placeholder="Design review"
          autoFocus
        />
      </FormRow>

      <FormRow label="Description" htmlFor="event-description">
        <Textarea
          id="event-description"
          value={description}
          onChange={(inputEvent) => setDescription(inputEvent.target.value)}
          rows={4}
        />
      </FormRow>

      <div className="grid gap-5 sm:grid-cols-2">
        <FormRow label="Phase" htmlFor="event-phase">
          <NativeSelect
            id="event-phase"
            value={phaseId}
            onChange={(selectEvent) => setPhaseId(selectEvent.target.value)}
            className="w-full"
          >
            <option value="">No phase</option>
            {phases.map((phase) => (
              <option key={phase.id} value={phase.id}>
                {phase.name}
              </option>
            ))}
          </NativeSelect>
        </FormRow>
        <FormRow label="Work item" htmlFor="event-work-item">
          <NativeSelect
            id="event-work-item"
            value={workItemId}
            onChange={(selectEvent) => setWorkItemId(selectEvent.target.value)}
            className="w-full"
          >
            <option value="">No work item</option>
            {workItems.map((item) => (
              <option key={item.id} value={item.id}>
                {item.identifier} · {item.title}
              </option>
            ))}
          </NativeSelect>
        </FormRow>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          className="size-4"
          checked={allDay}
          onChange={(inputEvent) => setAllDay(inputEvent.target.checked)}
        />
        All day
      </label>

      <div className="grid gap-5 sm:grid-cols-2">
        <FormRow label="Starts" htmlFor="event-starts-at" required>
          <Input
            id="event-starts-at"
            type={allDay ? 'date' : 'datetime-local'}
            value={startsAt}
            onChange={(inputEvent) => setStartsAt(inputEvent.target.value)}
          />
        </FormRow>
        <FormRow label="Ends" htmlFor="event-ends-at">
          <Input
            id="event-ends-at"
            type={allDay ? 'date' : 'datetime-local'}
            value={endsAt}
            onChange={(inputEvent) => setEndsAt(inputEvent.target.value)}
          />
        </FormRow>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <FormRow label="Location" htmlFor="event-location">
          <Input
            id="event-location"
            value={location}
            onChange={(inputEvent) => setLocation(inputEvent.target.value)}
            placeholder="Room 2"
          />
        </FormRow>
        <FormRow label="Meeting URL" htmlFor="event-meeting-url">
          <Input
            id="event-meeting-url"
            type="url"
            value={meetingUrl}
            onChange={(inputEvent) => setMeetingUrl(inputEvent.target.value)}
            placeholder="https://meet.example.com/design"
          />
        </FormRow>
      </div>

      <section className="border-border/60 space-y-3 border-t pt-4">
        <h3 className="text-sm font-medium">Attendees</h3>
        {attendeeIds.length === 0 ? (
          <p className="text-muted-foreground text-sm">Nobody invited yet.</p>
        ) : (
          <ul aria-label="Attendees" className="space-y-2">
            {attendeeIds.map((userId) => (
              <li
                key={userId}
                className="flex items-center justify-between gap-3 text-sm"
              >
                <span>
                  {options.members.find((member) => member.userId === userId)
                    ?.name ?? userId}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  aria-label={`Remove attendee ${
                    options.members.find((member) => member.userId === userId)
                      ?.name ?? userId
                  }`}
                  onClick={() =>
                    setAttendeeIds((current) =>
                      current.filter((id) => id !== userId)
                    )
                  }
                >
                  Remove
                </Button>
              </li>
            ))}
          </ul>
        )}

        <div className="flex flex-wrap items-end gap-3">
          <FormRow label="Member" htmlFor="event-attendee">
            <NativeSelect
              id="event-attendee"
              value={attendeeToAdd}
              onChange={(selectEvent) =>
                setAttendeeToAdd(selectEvent.target.value)
              }
              className="min-w-48"
            >
              <option value="">Select a member</option>
              {selectableMembers.map((member) => (
                <option key={member.userId} value={member.userId}>
                  {member.name}
                </option>
              ))}
            </NativeSelect>
          </FormRow>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!attendeeToAdd}
            onClick={() => {
              setAttendeeIds((current) => [...current, attendeeToAdd])
              setAttendeeToAdd('')
            }}
          >
            Add attendee
          </Button>
        </div>
      </section>

      <section className="border-border/60 space-y-3 border-t pt-4">
        <h3 className="text-sm font-medium">Repeats</h3>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="size-4"
            checked={recurrence.enabled}
            onChange={(inputEvent) =>
              setRecurrence((current) => ({
                ...current,
                enabled: inputEvent.target.checked,
              }))
            }
          />
          Repeat this {kind}
        </label>

        {recurrence.enabled ? (
          <div className="space-y-4">
            <div className="grid gap-5 sm:grid-cols-2">
              <FormRow label="Frequency" htmlFor="event-recurrence-freq">
                <NativeSelect
                  id="event-recurrence-freq"
                  value={recurrence.freq}
                  onChange={(selectEvent) =>
                    setRecurrence((current) => ({
                      ...current,
                      freq: selectEvent.target.value as RecurrenceDraft['freq'],
                    }))
                  }
                  className="w-full"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </NativeSelect>
              </FormRow>
              <FormRow label="Repeat every" htmlFor="event-recurrence-interval">
                <Input
                  id="event-recurrence-interval"
                  type="number"
                  min={1}
                  step={1}
                  value={recurrence.interval}
                  onChange={(inputEvent) =>
                    setRecurrence((current) => ({
                      ...current,
                      interval: inputEvent.target.value,
                    }))
                  }
                />
              </FormRow>
            </div>

            {recurrence.freq === 'weekly' ? (
              <fieldset>
                <legend className="text-sm font-medium">On weekdays</legend>
                <div className="mt-2 flex flex-wrap gap-3">
                  {WEEKDAY_OPTIONS.map((option) => (
                    <label
                      key={option.value}
                      className="flex items-center gap-1.5 text-sm"
                    >
                      <input
                        type="checkbox"
                        className="size-4"
                        checked={recurrence.byWeekday.includes(option.value)}
                        onChange={() => toggleWeekday(option.value)}
                      />
                      {option.label}
                    </label>
                  ))}
                </div>
              </fieldset>
            ) : null}

            <div className="grid gap-5 sm:grid-cols-2">
              <FormRow label="Series ends" htmlFor="event-recurrence-ends">
                <NativeSelect
                  id="event-recurrence-ends"
                  value={recurrence.ends}
                  onChange={(selectEvent) =>
                    setRecurrence((current) => ({
                      ...current,
                      ends: selectEvent.target.value as RecurrenceEnds,
                    }))
                  }
                  className="w-full"
                >
                  <option value="never">Never</option>
                  <option value="on">On a date</option>
                  <option value="after">After a number of occurrences</option>
                </NativeSelect>
              </FormRow>

              {recurrence.ends === 'on' ? (
                <FormRow label="Ends on" htmlFor="event-recurrence-until">
                  <Input
                    id="event-recurrence-until"
                    type="date"
                    value={recurrence.until}
                    onChange={(inputEvent) =>
                      setRecurrence((current) => ({
                        ...current,
                        until: inputEvent.target.value,
                      }))
                    }
                  />
                </FormRow>
              ) : null}

              {recurrence.ends === 'after' ? (
                <FormRow label="Occurrences" htmlFor="event-recurrence-count">
                  <Input
                    id="event-recurrence-count"
                    type="number"
                    min={1}
                    step={1}
                    value={recurrence.count}
                    onChange={(inputEvent) =>
                      setRecurrence((current) => ({
                        ...current,
                        count: inputEvent.target.value,
                      }))
                    }
                  />
                </FormRow>
              ) : null}
            </div>
          </div>
        ) : null}
      </section>

      <div className="flex justify-end gap-2 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={pending}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          variant="info"
          disabled={!title.trim() || !startsAt || pending}
        >
          {pending ? 'Saving…' : editing ? 'Save' : 'Add'}
        </Button>
      </div>
    </form>
  )
}
