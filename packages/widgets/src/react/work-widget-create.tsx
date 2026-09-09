'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { WorkCalendar, WorkHostContext, WorkTaskList } from '@876/work'
import { browserWork, type WorkBrowserClient } from '@876/work/browser'
import {
  WorkCreate,
  type WorkCreateEventDraft,
  type WorkCreateReminderDraft,
  type WorkCreateTaskDraft,
} from '@876/work-ui/create'

import type { WorkWidgetCapabilities } from '../work-capabilities'
import { WorkWidgetErrorBanner } from './work-widget-feedback'

export function WorkWidgetCreateView({
  capabilities,
  context,
  client = browserWork,
  onCreated,
}: {
  capabilities: WorkWidgetCapabilities
  context?: WorkHostContext
  client?: WorkBrowserClient
  onCreated: () => void
}) {
  const [taskLists, setTaskLists] = useState<WorkTaskList[]>([])
  const [calendars, setCalendars] = useState<WorkCalendar[]>([])
  const [creating, setCreating] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [enrichmentMessage, setEnrichmentMessage] = useState<string | null>(
    null
  )
  const createRef = useRef(false)

  const loadEnrichment = useCallback(async () => {
    setEnrichmentMessage(null)
    const [taskListsResult, calendarsResult] = await Promise.all([
      capabilities.canCreateTasks ? client.taskLists.list() : null,
      capabilities.canCreateEvents ? client.calendars.list() : null,
    ])

    const messages: string[] = []
    if (taskListsResult) {
      if (taskListsResult.data) setTaskLists(taskListsResult.data.data)
      else
        messages.push(
          taskListsResult.error?.message ?? 'Task lists could not be loaded.'
        )
    }
    if (calendarsResult) {
      if (calendarsResult.data) setCalendars(calendarsResult.data.data)
      else
        messages.push(
          calendarsResult.error?.message ?? 'Calendars could not be loaded.'
        )
    }
    setEnrichmentMessage(messages.length > 0 ? messages.join(' ') : null)
  }, [capabilities.canCreateEvents, capabilities.canCreateTasks, client])

  useEffect(() => {
    void loadEnrichment()
  }, [loadEnrichment])

  const runCreate = useCallback(
    async <T,>(
      operation: () => Promise<{
        data: T | null
        error: { message: string } | null
      }>
    ) => {
      if (createRef.current) return false

      createRef.current = true
      setCreating(true)
      setErrorMessage(null)
      const result = await operation()

      if (result.error || !result.data) {
        setErrorMessage(
          result.error?.message ??
            'The Work item could not be created. Try again.'
        )
        createRef.current = false
        setCreating(false)
        return false
      }

      createRef.current = false
      setCreating(false)
      onCreated()
      return true
    },
    [onCreated]
  )

  const createTask = useCallback(
    (input: WorkCreateTaskDraft) =>
      runCreate(() => client.tasks.create(input, context)),
    [client, context, runCreate]
  )

  const createEvent = useCallback(
    (input: WorkCreateEventDraft) =>
      runCreate(() => client.events.create(input, context)),
    [client, context, runCreate]
  )

  const createReminder = useCallback(
    (input: WorkCreateReminderDraft) =>
      runCreate(() => client.reminders.create(input, context)),
    [client, context, runCreate]
  )

  return (
    <>
      {errorMessage ? (
        <WorkWidgetErrorBanner
          message={errorMessage}
          onAction={() => setErrorMessage(null)}
          actionLabel="Dismiss"
        />
      ) : null}
      {enrichmentMessage ? (
        <WorkWidgetErrorBanner
          message={enrichmentMessage}
          onAction={() => void loadEnrichment()}
        />
      ) : null}
      <WorkCreate
        taskLists={taskLists}
        calendars={calendars}
        creating={creating}
        onCreateTask={capabilities.canCreateTasks ? createTask : undefined}
        onCreateEvent={capabilities.canCreateEvents ? createEvent : undefined}
        onCreateReminder={
          capabilities.canCreateReminders ? createReminder : undefined
        }
      />
    </>
  )
}
