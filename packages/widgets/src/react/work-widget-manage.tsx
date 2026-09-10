'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type {
  WorkCalendar,
  WorkCalendarSubscription,
  WorkRemoteCalendar,
  WorkSyncCalendarLink,
  WorkSyncConnectionSummary,
  WorkTaskList,
} from '@876/work'
import {
  browserWork,
  browserWorkCalendarSync,
  type WorkBrowserCalendarSyncClient,
  type WorkBrowserClient,
} from '@876/work/browser'
import {
  WorkCalendarSyncManager,
  type WorkCalendarSyncCaldavDraft,
} from '@876/work-ui/calendar-sync'
import {
  WorkManage,
  type WorkCalendarDraft,
  type WorkSubscriptionEdit,
  type WorkTaskListDraft,
} from '@876/work-ui/manage'

import type { WorkWidgetCapabilities } from '../work-capabilities'
import { WidgetPanelSkeleton } from './widget-loading'
import { WorkWidgetErrorBanner } from './work-widget-feedback'

const AUTHORIZATION_POLL_MS = 2_500
const AUTHORIZATION_POLL_LIMIT_MS = 5 * 60 * 1_000

export function WorkWidgetManageView({
  capabilities,
  client = browserWork,
  syncClient = browserWorkCalendarSync,
}: {
  capabilities: WorkWidgetCapabilities
  client?: WorkBrowserClient
  syncClient?: WorkBrowserCalendarSyncClient
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

  const [connections, setConnections] = useState<WorkSyncConnectionSummary[]>([])
  const [activeConnectionId, setActiveConnectionId] = useState<string | null>(
    null
  )
  const [remoteCalendars, setRemoteCalendars] = useState<WorkRemoteCalendar[]>([])
  const [calendarLinks, setCalendarLinks] = useState<WorkSyncCalendarLink[]>([])
  const [syncPending, setSyncPending] = useState(false)
  const [syncLoadingDetails, setSyncLoadingDetails] = useState(false)
  const [syncError, setSyncError] = useState<string | null>(null)
  const syncGenerationRef = useRef(0)
  const authorizationPollRef = useRef<{
    connectionId: string
    startedAt: number
  } | null>(null)

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
        setError(
          result.error?.message ?? 'Calendar preferences could not load.'
        )
        setSubscription(null)
        return
      }
      setSubscription(result.data.data[0] ?? null)
    },
    [client]
  )

  const loadConnections = useCallback(
    async (clearError = true) => {
      if (clearError) setSyncError(null)
      const result = await syncClient.connections.list()
      if (result.error || !result.data) {
        setSyncError(
          result.error?.message ?? 'Calendar connections could not load.'
        )
        return null
      }
      setConnections(result.data.data)
      return result.data.data
    },
    [syncClient]
  )

  const loadConnectionDetails = useCallback(
    async (connectionId: string) => {
      const generation = ++syncGenerationRef.current
      setSyncLoadingDetails(true)
      const [calendarsResult, linksResult] = await Promise.all([
        syncClient.connections.remoteCalendars(connectionId),
        syncClient.connections.calendarLinks.list(connectionId),
      ])
      if (generation !== syncGenerationRef.current) return

      const failure = calendarsResult.error ?? linksResult.error
      if (failure) setSyncError(failure.message)
      if (calendarsResult.data) setRemoteCalendars(calendarsResult.data.data)
      else setRemoteCalendars([])
      if (linksResult.data) setCalendarLinks(linksResult.data.data)
      else setCalendarLinks([])
      setSyncLoadingDetails(false)
    },
    [syncClient]
  )

  useEffect(() => {
    void loadBase()
  }, [loadBase])

  useEffect(() => {
    void loadConnections()
  }, [loadConnections])

  useEffect(() => {
    if (!activeCalendarId) {
      subscriptionGenerationRef.current += 1
      setSubscription(null)
      return
    }
    void loadSubscription(activeCalendarId)
  }, [activeCalendarId, loadSubscription])

  useEffect(() => {
    const connection = connections.find(
      (item) => item.id === activeConnectionId
    )
    if (!connection || !connection.authorized) {
      syncGenerationRef.current += 1
      setRemoteCalendars([])
      setCalendarLinks([])
      setSyncLoadingDetails(false)
      return
    }
    void loadConnectionDetails(connection.id)
  }, [activeConnectionId, connections, loadConnectionDetails])

  useEffect(() => {
    const connection = connections.find(
      (item) => item.id === activeConnectionId
    )
    if (
      !connection ||
      connection.authorized ||
      connection.provider === 'CALDAV'
    ) {
      authorizationPollRef.current = null
      return
    }

    if (authorizationPollRef.current?.connectionId !== connection.id) {
      authorizationPollRef.current = {
        connectionId: connection.id,
        startedAt: Date.now(),
      }
    }

    const timer = window.setInterval(() => {
      const poll = authorizationPollRef.current
      if (!poll || poll.connectionId !== connection.id) return
      if (Date.now() - poll.startedAt >= AUTHORIZATION_POLL_LIMIT_MS) {
        window.clearInterval(timer)
        return
      }
      void loadConnections(false)
    }, AUTHORIZATION_POLL_MS)

    return () => window.clearInterval(timer)
  }, [activeConnectionId, connections, loadConnections])

  async function mutate(
    operation: () => Promise<{ error: { message: string } | null }>
  ) {
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

  function openAuthorization(url: string) {
    window.open(url, 'work-calendar-authorization', 'noopener,noreferrer')
  }

  async function connectOAuth(provider: 'GOOGLE' | 'MICROSOFT') {
    if (syncPending) return false
    setSyncPending(true)
    setSyncError(null)

    const setup = await syncClient.connections.setup({ provider })
    if (setup.error || !setup.data) {
      setSyncError(setup.error?.message ?? 'Calendar connection could not start.')
      setSyncPending(false)
      return false
    }

    setActiveConnectionId(setup.data.id)
    await loadConnections(false)
    const authorization = await syncClient.connections.authorize(setup.data.id)
    if (authorization.error || !authorization.data) {
      setSyncError(
        authorization.error?.message ?? 'Calendar authorization could not start.'
      )
      setSyncPending(false)
      return false
    }

    authorizationPollRef.current = {
      connectionId: setup.data.id,
      startedAt: Date.now(),
    }
    openAuthorization(authorization.data.authorizeUrl)
    setSyncPending(false)
    return true
  }

  async function connectCaldav(input: WorkCalendarSyncCaldavDraft) {
    if (syncPending) return false
    setSyncPending(true)
    setSyncError(null)
    const result = await syncClient.connections.setup({
      provider: 'CALDAV',
      ...input,
    })
    if (result.error || !result.data) {
      setSyncError(result.error?.message ?? 'CalDAV connection could not be added.')
      setSyncPending(false)
      return false
    }

    setActiveConnectionId(result.data.id)
    await loadConnections(false)
    setSyncPending(false)
    return true
  }

  async function authorizeConnection(connection: WorkSyncConnectionSummary) {
    if (syncPending || connection.provider === 'CALDAV') return
    setSyncPending(true)
    setSyncError(null)
    const result = await syncClient.connections.authorize(connection.id)
    if (result.error || !result.data) {
      setSyncError(
        result.error?.message ?? 'Calendar authorization could not start.'
      )
      setSyncPending(false)
      return
    }

    authorizationPollRef.current = {
      connectionId: connection.id,
      startedAt: Date.now(),
    }
    openAuthorization(result.data.authorizeUrl)
    setSyncPending(false)
  }

  async function runSyncCommand(
    operation: () => Promise<{ error: { message: string } | null }>,
    connectionId = activeConnectionId
  ) {
    if (syncPending) return false
    setSyncPending(true)
    setSyncError(null)
    const result = await operation()
    if (result.error) {
      setSyncError(result.error.message)
      setSyncPending(false)
      return false
    }

    await Promise.all([loadConnections(false), loadBase()])
    if (connectionId) await loadConnectionDetails(connectionId)
    setSyncPending(false)
    return true
  }

  if (loading) return <WidgetPanelSkeleton label="Loading Work management" />

  const canManageCalendars =
    capabilities.canCreateCalendars || capabilities.canEditCalendars

  return (
    <>
      {error ? (
        <WorkWidgetErrorBanner
          message={error}
          onAction={() => void loadBase()}
        />
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
        canManageCalendars={canManageCalendars}
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
            ? (
                current: WorkCalendarSubscription,
                input: WorkSubscriptionEdit
              ) =>
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
      {syncError ? (
        <WorkWidgetErrorBanner
          message={syncError}
          onAction={() => void loadConnections()}
        />
      ) : null}
      <WorkCalendarSyncManager
        connections={connections}
        activeConnectionId={activeConnectionId}
        remoteCalendars={remoteCalendars}
        calendarLinks={calendarLinks}
        pending={syncPending}
        loadingRemoteCalendars={syncLoadingDetails}
        canManage={canManageCalendars}
        onSelectConnection={setActiveConnectionId}
        onConnectOAuth={canManageCalendars ? connectOAuth : undefined}
        onConnectCaldav={canManageCalendars ? connectCaldav : undefined}
        onAuthorize={canManageCalendars ? authorizeConnection : undefined}
        onLinkCalendar={
          canManageCalendars
            ? (connection, remoteCalendar) =>
                runSyncCommand(
                  () =>
                    syncClient.connections.calendarLinks.create(connection.id, {
                      remoteCalendarId: remoteCalendar.remoteId,
                    }),
                  connection.id
                ).then(() => undefined)
            : undefined
        }
        onUnlinkCalendar={
          canManageCalendars
            ? (link) =>
                runSyncCommand(
                  () =>
                    syncClient.connections.calendarLinks.delete(
                      link.connectionId,
                      link.id
                    ),
                  link.connectionId
                ).then(() => undefined)
            : undefined
        }
        onSyncConnection={
          canManageCalendars
            ? (connection) =>
                runSyncCommand(
                  () => syncClient.connections.sync(connection.id),
                  connection.id
                ).then(() => undefined)
            : undefined
        }
        onSyncCalendar={
          canManageCalendars
            ? (link) =>
                runSyncCommand(
                  () =>
                    syncClient.connections.calendarLinks.sync(
                      link.connectionId,
                      link.id
                    ),
                  link.connectionId
                ).then(() => undefined)
            : undefined
        }
        onDisconnect={
          canManageCalendars
            ? (connection) =>
                runSyncCommand(
                  () => syncClient.connections.delete(connection.id),
                  null
                ).then((success) => {
                  if (success) setActiveConnectionId(null)
                })
            : undefined
        }
      />
    </>
  )
}
