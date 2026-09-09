'use client'

import { useMemo, useState } from 'react'

import {
  EMPTY_WORK_WIDGET_CAPABILITIES,
  type WorkWidgetCapabilities,
} from '../work-capabilities'
import { WorkWidgetCalendarView } from './work-widget-calendar'
import { WorkWidgetCreateView } from './work-widget-create'
import { WorkWidgetTasksView } from './work-widget-tasks'
import { WorkWidgetTodayView } from './work-widget-today'

export { currentDayWindow } from './work-widget-time'

type WorkView = 'today' | 'tasks' | 'calendar' | 'create'

function WorkViewNav({
  view,
  views,
  onChange,
}: {
  view: WorkView
  views: readonly WorkView[]
  onChange: (view: WorkView) => void
}) {
  return (
    <div className="border-876-surface-border flex gap-1 overflow-x-auto border-b px-3 py-2">
      {views.map((item) => (
        <button
          key={item}
          type="button"
          aria-pressed={view === item}
          onClick={() => onChange(item)}
          className="aria-pressed:bg-muted focus-visible:ring-ring shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium capitalize focus-visible:ring-2 focus-visible:outline-none"
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
  const views = useMemo<readonly WorkView[]>(() => {
    const canCreate =
      capabilities.canCreateTasks ||
      capabilities.canCreateEvents ||
      capabilities.canCreateReminders
    return canCreate
      ? ['today', 'tasks', 'calendar', 'create']
      : ['today', 'tasks', 'calendar']
  }, [
    capabilities.canCreateEvents,
    capabilities.canCreateReminders,
    capabilities.canCreateTasks,
  ])
  const activeView = views.includes(view) ? view : 'today'

  return (
    <div className="min-h-full">
      <WorkViewNav view={activeView} views={views} onChange={setView} />
      {activeView === 'today' ? (
        <WorkWidgetTodayView capabilities={capabilities} />
      ) : activeView === 'tasks' ? (
        <WorkWidgetTasksView capabilities={capabilities} />
      ) : activeView === 'calendar' ? (
        <WorkWidgetCalendarView />
      ) : (
        <WorkWidgetCreateView
          capabilities={capabilities}
          onCreated={() => setView('today')}
        />
      )}
    </div>
  )
}
