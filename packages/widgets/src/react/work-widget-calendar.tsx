'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { WorkCalendar, WorkMyWork } from '@876/work'
import { browserWork } from '@876/work/browser'
import {
  WorkCalendarSurface,
  type WorkCalendarView,
} from '@876/work-ui/calendar'

import { WidgetPanelSkeleton } from './widget-loading'
import { WorkWidgetErrorBanner, WorkWidgetInitialError } from './work-widget-feedback'
import { calendarWindow, moveCalendarAnchor } from './work-widget-time'

type LoadState = 'loading' | 'ready' | 'error'

export function WorkWidgetCalendarView() {
  const [work, setWork] = useState<WorkMyWork | null>(null)
  const [calendars, setCalendars] = useState<WorkCalendar[]>([])
  const [state, setState] = useState<LoadState>('loading')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [enrichmentMessage, setEnrichmentMessage] = useState<string | null>(null)
  const [view, setView] = useState<WorkCalendarView>('month')
  const [anchor, setAnchor] = useState(() => new Date())
  const [activeCalendarId, setActiveCalendarId] = useState<string | null>(null)

  const workRef = useRef<WorkMyWork | null>(null)
  const generationRef = useRef(0)

  const loadCalendars = useCallback(async () => {
    setEnrichmentMessage(null)
    const result = await browserWork.calendars.list()
    if (result.error || !result.data) {
      setEnrichmentMessage(
        result.error?.message ?? 'Calendars could not be loaded.'
      )
      return
    }
    setCalendars(result.data.data)
  }, [])

  const loadRange = useCallback(async (nextView: WorkCalendarView, date: Date) => {
    const generation = ++generationRef.current
    if (!workRef.current) setState('loading')
    setErrorMessage(null)

    const result = await browserWork.myWork.retrieve(calendarWindow(nextView, date))
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
  }, [])

  useEffect(() => {
    void loadCalendars()
    void loadRange('month', anchor)
  }, [anchor, loadCalendars, loadRange])

  const changeView = useCallback(
    (nextView: WorkCalendarView) => {
      setView(nextView)
      void loadRange(nextView, anchor)
    },
    [anchor, loadRange]
  )

  const navigate = useCallback(
    (direction: 'previous' | 'today' | 'next') => {
      const nextAnchor = moveCalendarAnchor(view, anchor, direction)
      setAnchor(nextAnchor)
      void loadRange(view, nextAnchor)
    },
    [anchor, loadRange, view]
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
          onRetry={() => void loadRange(view, anchor)}
        />
      ) : null}
      {enrichmentMessage ? (
        <WorkWidgetErrorBanner
          message={enrichmentMessage}
          onRetry={() => void loadCalendars()}
        />
      ) : null}
      <WorkCalendarSurface
        work={work}
        calendars={calendars}
        view={view}
        anchorDate={anchor}
        activeCalendarId={activeCalendarId}
        onChangeView={changeView}
        onNavigate={navigate}
        onSelectCalendar={setActiveCalendarId}
      />
    </>
  )
}
