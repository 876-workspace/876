'use client'

import { useState } from 'react'

import {
  EMPTY_WORK_WIDGET_CAPABILITIES,
  type WorkWidgetCapabilities,
} from '../work-capabilities'
import { WorkWidgetCalendarView } from './work-widget-calendar'
import { WorkWidgetTasksView } from './work-widget-tasks'
import { WorkWidgetTodayView } from './work-widget-today'

export { currentDayWindow } from './work-widget-time'

type WorkView = 'today' | 'tasks' | 'calendar'

function WorkViewNav({
  view,
  onChange,
}: {
  view: WorkView
  onChange: (view: WorkView) => void
}) {
  return (
    <div className="border-876-surface-border flex gap-1 border-b px-3 py-2">
      {(['today', 'tasks', 'calendar'] as const).map((item) => (
        <button
          key={item}
          type="button"
          aria-pressed={view === item}
          onClick={() => onChange(item)}
          className="aria-pressed:bg-muted focus-visible:ring-ring rounded-lg px-3 py-1.5 text-xs font-medium capitalize focus-visible:ring-2 focus-visible:outline-none"
        >
          {item}
        </button>
      ))}
    </div>
  )
}

export function WorkWidgetPanel({
  capabilities = EMPTY_WORK_WIDGET_CAPABILITIES,
}: {
  capabilities?: WorkWidgetCapabilities
}) {
  const [view, setView] = useState<WorkView>('today')

  return (
    <div className="min-h-full">
      <WorkViewNav view={view} onChange={setView} />
      {view === 'today' ? (
        <WorkWidgetTodayView capabilities={capabilities} />
      ) : view === 'tasks' ? (
        <WorkWidgetTasksView capabilities={capabilities} />
      ) : (
        <WorkWidgetCalendarView />
      )}
    </div>
  )
}
