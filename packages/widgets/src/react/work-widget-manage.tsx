'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type {
  WorkCalendar,
  WorkCalendarSubscription,
  WorkTaskList,
} from '@876/work'
import { browserWork, type WorkBrowserClient } from '@876/work/browser'
import {
  WorkManage,
  type WorkCalendarDraft,
  type WorkSubscriptionEdit,
  type WorkTaskListDraft,
} from '@876/work-ui/manage'

import type { WorkWidgetCapabilities } from '../work-capabilities'
import { WidgetPanelSkeleton } from './widget-loading'
import { WorkWidgetErrorBanner } from './work-widget-feedback'

export function WorkWidgetManageView({
  capabilities,
  client = browserWork,
}: {
  capabilities: WorkWidgetCapabilities
  client?: WorkBrowserClient
}) {
  const [taskLists, setTaskLists] = useState<WorkTaskList[]>([])
  const [calendars, setCalendars] = useState<WorkCalendar[]>([])
  const [activeCalendarId, setActiveCalendarId] = useState<string | null>(null)
  const [subscription, setSubscription] =
    useState<WorkCalendarSubscription | null>(null)
  const [loading, setLoading] = useState(true)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const subscriptionGenerationRef = useRef(0)

  const loadBase = useCallback(async () => {
    setError(null)
    const [listsResult, calendarsResult] = await Promise.all([
      client.taskLists.list(),
      client.calendars.list(),
    ])
    const failure = listsResult.error ?? calendarsResult.error
    if (failure) setError(failure.message)
    if (listsResult.data) setTaskLists(listsResult.data.data)
    if (calendarsResult.data) setCalendars(calendarsResult.data.data)
    setLoading(false)
  }, [client])

  const loadSubscription = useCallback(
    async (calendarId: string) => {
      const generation = ++subscriptionGenerationRef.current
      const result = await client.calendarSubscriptions.list(calendarId)
      if (generation !== subscriptionGenerationRef.current) return
      if (result.error || !result.data) {
        setError(result.error?.message ?? 'Calendar preferences could not load.')
        setSubscription(null)
        return
      }
      setSubscription(result.data.data[0] ?? null)
    },
    [client]
  )

  useEffect(() => {
    void loadBase()
  }, [loadBase])

  useEffect(() => {
    if (!activeCalendarId) {
      subscriptionGenerationRef.current += 1
      setSubscription(null)
      return
    }
    void loadSubscription(activeCalendarId)
  }, [activeCalendarId, loadSubscription])

  async function mutate(operation: () => Promise<{ error: { message: string } | null }>) {
    if (pending) return false
    setPending(true)
    setError(null)
    const result = await operation()
    if (result.error) {
      setError(result.error.message)
      setPending(false)
      return false
    }
    await loadBase()
    if (activeCalendarId) await loadSubscription(activeCalendarId)
    setPending(false)
    return true
  }

  if (loading) return <WidgetPanelSkeleton label="Loading Work management" />

  return (
    <>
      {error ? (
        <WorkWidgetErrorBanner message={error} onAction={() => void loadBase()} />
      ) : null}
      <WorkManage
        taskLists={taskLists}
        calendars={calendars}
        activeCalendarId={activeCalendarId}
        subscription={subscription}
        pending={pending}
        canManageTaskLists={
          capabilities.canCreateTasks || capabilities.canEditTasks
        }
        canManageCalendars={
          capabilities.canCreateCalendars || capabilities.canEditCalendars
        }
        onSelectCalendar={setActiveCalendarId}
        onCreateTaskList={
          capabilities.canCreateTasks
            ? (input: WorkTaskListDraft) =>
                mutate(() => client.taskLists.create(input))
            : undefined
        }
        onUpdateTaskList={
          capabilities.canEditTasks
            ? (list, input) =>
                mutate(() => client.taskLists.update(list.id, input)).then(
                  () => undefined
                )
            : undefined
        }
        onCreateCalendar={
          capabilities.canCreateCalendars
            ? (input: WorkCalendarDraft) =>
                mutate(() => client.calendars.create(input))
            : undefined
        }
        onUpdateCalendar={
          capabilities.canEditCalendars
            ? (calendar, input) =>
                mutate(() => client.calendars.update(calendar.id, input)).then(
                  () => undefined
                )
            : undefined
        }
        onUpdateSubscription={
          capabilities.canEditCalendars && activeCalendarId
            ? (current: WorkCalendarSubscription, input: WorkSubscriptionEdit) =>
                mutate(() =>
                  client.calendarSubscriptions.update(
                    activeCalendarId,
                    current.id,
                    input
                  )
                ).then(() => undefined)
            : undefined
        }
      />
    </>
  )
}
