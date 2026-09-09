'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { WorkCalendar, WorkMyWork } from '@876/work'
import { browserWork } from '@876/work/browser'
import {
  WorkCalendarSurface,
  type WorkCalendarView,
} from '@876/work-ui/calendar'

import { WidgetPanelSkeleton } from './widget-loading'
import {
  WorkWidgetErrorBanner,
  WorkWidgetInitialError,
} from './work-widget-feedback'
import { calendarWindow, moveCalendarAnchor } from './work-widget-time'

type LoadState = 'loading' | 'ready' | 'error'

export function WorkWidgetCalendarView() {
  const [work, setWork] = useState<WorkMyWork | null>(null)
  const [calendars, setCalendars] = useState<WorkCalendar[]>([])
  const [state, setState] = useState<LoadState>('loading')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [enrichmentMessage, setEnrichmentMessage] = useState<string | null>(
    null
  )
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
    </>
  )
}
