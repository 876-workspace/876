'use client'

import { useMemo, useState } from 'react'
import type { WorkHostContext } from '@876/work'
import { browserWork, type WorkBrowserClient } from '@876/work/browser'

import {
  EMPTY_WORK_WIDGET_CAPABILITIES,
  type WorkWidgetCapabilities,
} from '../work-capabilities'
import { WorkWidgetCalendarView } from './work-widget-calendar'
import { WorkWidgetCreateView } from './work-widget-create'
import {
  WorkWidgetScopeSelector,
  type WorkWidgetScope,
} from './work-widget-scope'
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
  context,
  client = browserWork,
}: {
  capabilities?: WorkWidgetCapabilities
  context?: WorkHostContext
  client?: WorkBrowserClient
}) {
  const [view, setView] = useState<WorkView>('today')
  const [scope, setScope] = useState<WorkWidgetScope>('my-work')
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
  const activeScope = context ? scope : 'my-work'
  const activeContext = activeScope === 'context' ? context : undefined
  const scopeKey = activeContext
    ? `context:${activeContext.service}:${activeContext.resource}:${activeContext.externalId}`
    : 'my-work'

  return (
    <div className="min-h-full">
      {context ? (
        <WorkWidgetScopeSelector
          context={context}
          scope={activeScope}
          onChange={setScope}
        />
      ) : null}
      <WorkViewNav view={activeView} views={views} onChange={setView} />
      {activeView === 'today' ? (
        <WorkWidgetTodayView
          key={scopeKey}
          capabilities={capabilities}
          context={activeContext}
          client={client}
        />
      ) : activeView === 'tasks' ? (
        <WorkWidgetTasksView
          key={scopeKey}
          capabilities={capabilities}
          context={activeContext}
          client={client}
        />
      ) : activeView === 'calendar' ? (
        <WorkWidgetCalendarView
          key={scopeKey}
          context={activeContext}
          client={client}
        />
      ) : (
        <WorkWidgetCreateView
          key={scopeKey}
          capabilities={capabilities}
          context={activeContext}
          client={client}
          onCreated={() => setView('today')}
        />
      )}
    </div>
  )
}
