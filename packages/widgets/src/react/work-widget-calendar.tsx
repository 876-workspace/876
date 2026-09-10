'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { WorkAgendaData, WorkCalendar, WorkHostContext } from '@876/work'
import { browserWork, type WorkBrowserClient } from '@876/work/browser'
import {
  WorkCalendarSurface,
  type WorkCalendarView,
} from '@876/work-ui/calendar'

import {
  EMPTY_WORK_WIDGET_CAPABILITIES,
  type WorkWidgetCapabilities,
} from '../work-capabilities'
import { WidgetPanelSkeleton } from './widget-loading'
import {
  WorkWidgetErrorBanner,
  WorkWidgetInitialError,
} from './work-widget-feedback'
import { WorkWidgetScheduleAdvanced } from './work-widget-schedule-advanced'
import { calendarWindow, moveCalendarAnchor } from './work-widget-time'

type LoadState = 'loading' | 'ready' | 'error'

export function WorkWidgetCalendarView({
  capabilities = EMPTY_WORK_WIDGET_CAPABILITIES,
  context,
  client = browserWork,
}: {
  capabilities?: WorkWidgetCapabilities
  context?: WorkHostContext
  client?: WorkBrowserClient
}) {
  const [work, setWork] = useState<WorkAgendaData | null>(null)
  const [calendars, setCalendars] = useState<WorkCalendar[]>([])
  const [state, setState] = useState<LoadState>('loading')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [enrichmentMessage, setEnrichmentMessage] = useState<string | null>(
    null
  )
  const [view, setView] = useState<WorkCalendarView>('month')
  const [anchor, setAnchor] = useState(() => new Date())
  const [activeCalendarId, setActiveCalendarId] = useState<string | null>(null)

  const workRef = useRef<WorkAgendaData | null>(null)
  const generationRef = useRef(0)

  const loadCalendars = useCallback(async () => {
    setEnrichmentMessage(null)
    const result = await client.calendars.list()
    if (result.error || !result.data) {
      setEnrichmentMessage(
        result.error?.message ?? 'Calendars could not be loaded.'
      )
      return
    }
    setCalendars(result.data.data)
  }, [client])

  const loadRange = useCallback(
    async (nextView: WorkCalendarView, date: Date) => {
      const generation = ++generationRef.current
      if (!workRef.current) setState('loading')
      setErrorMessage(null)

      const window = calendarWindow(nextView, date)
      const result = context
        ? await client.resourceWork.retrieve(window)
        : await client.myWork.retrieve(window)
      if (generation !== generationRef.current) return

      if (result.error || !result.data) {
        setState('error')
        setErrorMessage(
          result.error?.message ?? 'Calendar could not be loaded. Try again.'
        )
        return
      }

      workRef.current = result.data
      setWork(result.data)
      setState('ready')
    },
    [client, context]
  )

  useEffect(() => {
    void loadCalendars()
  }, [loadCalendars])

  useEffect(() => {
    const desired = calendarWindow(view, anchor)
    const current = workRef.current
    if (current?.from === desired.from && current.to === desired.to) return
    void loadRange(view, anchor)
  }, [anchor, loadRange, view])

  const navigate = useCallback(
    (direction: 'previous' | 'today' | 'next') => {
      setAnchor((current) => moveCalendarAnchor(view, current, direction))
    },
    [view]
  )

  if (state === 'loading' && !work)
    return <WidgetPanelSkeleton label="Loading calendar" />

  if (state === 'error' && !work)
    return (
      <WorkWidgetInitialError
        title="Unable to load Calendar"
        message={errorMessage}
        onRetry={() => void loadRange(view, anchor)}
      />
    )

  if (!work) return <WidgetPanelSkeleton label="Loading calendar" />

  return (
    <>
      {state === 'error' ? (
        <WorkWidgetErrorBanner
          message={errorMessage}
          onAction={() => void loadRange(view, anchor)}
        />
      ) : null}
      {enrichmentMessage ? (
        <WorkWidgetErrorBanner
          message={enrichmentMessage}
          onAction={() => void loadCalendars()}
        />
      ) : null}
      <WorkCalendarSurface
        work={work}
        calendars={calendars}
        view={view}
        anchorDate={anchor}
        activeCalendarId={activeCalendarId}
        onChangeView={setView}
        onNavigate={navigate}
        onSelectDate={setAnchor}
        onSelectCalendar={setActiveCalendarId}
      />
      <WorkWidgetScheduleAdvanced
        work={work}
        capabilities={capabilities}
        context={context}
        client={client}
      />
    </>
  )
}
