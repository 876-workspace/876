'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type {
  WorkAgendaData,
  WorkAlert,
  WorkEventParticipant,
  WorkHostContext,
  WorkRecurrenceRule,
} from '@876/work'
import { browserWork, type WorkBrowserClient } from '@876/work/browser'
import { WorkAlerts, type WorkAlertDraft } from '@876/work-ui/alerts'
import {
  WorkEventParticipants,
  type WorkEventParticipantDraft,
} from '@876/work-ui/collaboration'
import { WorkRecurrenceEditor } from '@876/work-ui/recurrence'

import type { WorkWidgetCapabilities } from '../work-capabilities'
import { WorkWidgetErrorBanner } from './work-widget-feedback'

type Selection =
  { type: 'event'; id: string } | { type: 'reminder'; id: string } | null

function parseSelection(value: string): Selection {
  if (!value) return null
  const [type, id] = value.split(':', 2)
  if (!id || (type !== 'event' && type !== 'reminder')) return null
  return { type, id }
}

export function WorkWidgetScheduleAdvanced({
  work,
  capabilities,
  context,
  client = browserWork,
}: {
  work: WorkAgendaData
  capabilities: WorkWidgetCapabilities
  context?: WorkHostContext
  client?: WorkBrowserClient
}) {
  const [selection, setSelection] = useState<Selection>(null)
  const [participants, setParticipants] = useState<WorkEventParticipant[]>([])
  const [rule, setRule] = useState<WorkRecurrenceRule | null>(null)
  const [alerts, setAlerts] = useState<WorkAlert[]>([])
  const [loading, setLoading] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const generationRef = useRef(0)

  const load = useCallback(
    async (selected: Exclude<Selection, null>) => {
      const generation = ++generationRef.current
      setLoading(true)
      setError(null)

      if (selected.type === 'event') {
        const [participantResult, recurrenceResult, alertResult] =
          await Promise.all([
            client.eventParticipants.list(selected.id, context),
            client.events.recurrence.retrieve(selected.id, context),
            client.alerts.listForEvent(selected.id, context),
          ])
        if (generation !== generationRef.current) return
        const failure =
          participantResult.error ?? recurrenceResult.error ?? alertResult.error
        if (failure) setError(failure.message)
        if (participantResult.data) setParticipants(participantResult.data.data)
        if (recurrenceResult.data !== undefined) setRule(recurrenceResult.data)
        if (alertResult.data) setAlerts(alertResult.data.data)
      } else {
        const recurrenceResult = await client.reminders.recurrence.retrieve(
          selected.id,
          context
        )
        if (generation !== generationRef.current) return
        if (recurrenceResult.error) setError(recurrenceResult.error.message)
        if (recurrenceResult.data !== undefined) setRule(recurrenceResult.data)
        setParticipants([])
        setAlerts([])
      }
      setLoading(false)
    },
    [client, context]
  )

  useEffect(() => {
    if (!selection) {
      generationRef.current += 1
      setParticipants([])
      setRule(null)
      setAlerts([])
      setError(null)
      return
    }
    void load(selection)
  }, [load, selection])

  async function mutate(
    operation: () => Promise<{ error: { message: string } | null }>
  ) {
    if (!selection || pending) return false
    setPending(true)
    setError(null)
    const result = await operation()
    if (result.error) {
      setError(result.error.message)
      setPending(false)
      return false
    }
    await load(selection)
    setPending(false)
    return true
  }

  const selectionValue = selection ? `${selection.type}:${selection.id}` : ''

  return (
    <section
      className="border-876-surface-border mx-4 mb-4 space-y-3 rounded-xl border p-3"
      aria-label="Advanced schedule controls"
    >
      <div>
        <p className="text-sm font-semibold">Advanced schedule controls</p>
        <p className="text-muted-foreground mt-1 text-xs">
          Manage recurrence, participants, responses, and alerts for scheduled
          Work.
        </p>
      </div>
      <select
        value={selectionValue}
        onChange={(event) => setSelection(parseSelection(event.target.value))}
        aria-label="Scheduled item to manage"
        className="border-876-surface-border bg-background w-full rounded-lg border px-2.5 py-2 text-sm"
      >
        <option value="">Select an event or reminder</option>
        {work.events.map((event) => (
          <option key={`event:${event.id}`} value={`event:${event.id}`}>
            Event · {event.title}
          </option>
        ))}
        {work.reminders.map((reminder) => (
          <option
            key={`reminder:${reminder.id}`}
            value={`reminder:${reminder.id}`}
          >
            Reminder · {reminder.title}
          </option>
        ))}
      </select>

      {error ? (
        <WorkWidgetErrorBanner
          message={error}
          onAction={() => {
            if (selection) void load(selection)
          }}
        />
      ) : null}

      {selection ? (
        <div className="space-y-3" aria-busy={loading || pending}>
          <WorkRecurrenceEditor
            key={`${selection.type}-recurrence:${selection.id}:${rule?.id ?? 'none'}`}
            rule={rule}
            pending={loading || pending}
            onSave={(input) =>
              mutate(() =>
                selection.type === 'event'
                  ? client.events.recurrence.set(selection.id, input, context)
                  : client.reminders.recurrence.set(
                      selection.id,
                      input,
                      context
                    )
              ).then(() => undefined)
            }
            onClear={
              rule
                ? () =>
                    mutate(() =>
                      selection.type === 'event'
                        ? client.events.recurrence.clear(selection.id, context)
                        : client.reminders.recurrence.clear(
                            selection.id,
                            context
                          )
                    ).then(() => undefined)
                : undefined
            }
          />

          {selection.type === 'event' ? (
            <>
              <WorkEventParticipants
                participants={participants}
                pending={loading || pending}
                canManage={capabilities.canInviteEvents}
                canRespond={capabilities.canRespondEvents}
                onInvite={
                  capabilities.canInviteEvents
                    ? (input: WorkEventParticipantDraft) =>
                        mutate(() =>
                          client.eventParticipants.create(
                            selection.id,
                            input,
                            context
                          )
                        )
                    : undefined
                }
                onRemove={
                  capabilities.canInviteEvents
                    ? (participant) =>
                        mutate(() =>
                          client.eventParticipants.delete(
                            selection.id,
                            participant.id,
                            context
                          )
                        ).then(() => undefined)
                    : undefined
                }
                onRespond={
                  capabilities.canRespondEvents
                    ? (participant, status) =>
                        mutate(() =>
                          client.eventParticipants.respond(
                            selection.id,
                            participant.id,
                            { status },
                            context
                          )
                        ).then(() => undefined)
                    : undefined
                }
              />
              <WorkAlerts
                alerts={alerts}
                pending={loading || pending}
                canManage={capabilities.canEditEvents}
                onCreate={
                  capabilities.canEditEvents
                    ? (input: WorkAlertDraft) =>
                        mutate(() =>
                          client.alerts.createForEvent(
                            selection.id,
                            input,
                            context
                          )
                        )
                    : undefined
                }
                onDismiss={
                  capabilities.canEditEvents
                    ? (alert) =>
                        mutate(() =>
                          client.alerts.updateForEvent(
                            selection.id,
                            alert.id,
                            { status: 'DISMISSED' },
                            context
                          )
                        ).then(() => undefined)
                    : undefined
                }
                onRemove={
                  capabilities.canEditEvents
                    ? (alert) =>
                        mutate(() =>
                          client.alerts.deleteForEvent(
                            selection.id,
                            alert.id,
                            context
                          )
                        ).then(() => undefined)
                    : undefined
                }
              />
            </>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}
