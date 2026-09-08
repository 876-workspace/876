'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type {
  WorkCalendar,
  WorkMyWork,
  WorkTask,
  WorkTaskList,
} from '@876/work'
import { browserWork } from '@876/work/browser'
import {
  WorkCalendarSurface,
  type WorkCalendarView,
} from '@876/work-ui/calendar'
import {
  WorkTasks,
  type WorkTaskDraft,
  type WorkTaskEdit,
} from '@876/work-ui/tasks'
import { WorkToday } from '@876/work-ui/today'

import { WidgetPanelSkeleton } from './widget-loading'

type LoadState = 'loading' | 'ready' | 'error'
type DeferredLoadState = 'idle' | LoadState
type WorkView = 'today' | 'tasks' | 'calendar'

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days)
}

export function currentDayWindow(now = new Date()) {
  const start = startOfDay(now)
  const end = addDays(start, 1)
  return {
    from: Math.floor(start.getTime() / 1000),
    to: Math.floor(end.getTime() / 1000),
  }
}

function calendarWindow(view: WorkCalendarView, anchor: Date) {
  const day = startOfDay(anchor)
  if (view === 'day') {
    return {
      from: Math.floor(day.getTime() / 1000),
      to: Math.floor(addDays(day, 1).getTime() / 1000),
    }
  }

  if (view === 'week') {
    const start = addDays(day, -day.getDay())
    return {
      from: Math.floor(start.getTime() / 1000),
      to: Math.floor(addDays(start, 7).getTime() / 1000),
    }
  }

  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1)
  const start = addDays(first, -first.getDay())
  return {
    from: Math.floor(start.getTime() / 1000),
    to: Math.floor(addDays(start, 42).getTime() / 1000),
  }
}

function moveCalendarAnchor(
  view: WorkCalendarView,
  anchor: Date,
  direction: 'previous' | 'today' | 'next'
): Date {
  if (direction === 'today') return new Date()
  const amount = direction === 'previous' ? -1 : 1
  if (view === 'day') return addDays(anchor, amount)
  if (view === 'week') return addDays(anchor, amount * 7)
  return new Date(anchor.getFullYear(), anchor.getMonth() + amount, 1)
}

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

function ErrorBanner({
  message,
  onRetry,
}: {
  message: string | null
  onRetry: () => void
}) {
  if (!message) return null
  return (
    <div className="border-b border-amber-500/25 bg-amber-500/10 px-4 py-2 text-xs">
      {message}
      <button
        type="button"
        onClick={onRetry}
        className="ml-2 font-medium underline underline-offset-2"
      >
        Try again
      </button>
    </div>
  )
}

export function WorkWidgetPanel() {
  const [view, setView] = useState<WorkView>('today')
  const [work, setWork] = useState<WorkMyWork | null>(null)
  const [state, setState] = useState<LoadState>('loading')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const [taskLists, setTaskLists] = useState<WorkTaskList[]>([])
  const [tasks, setTasks] = useState<WorkTask[]>([])
  const [activeListId, setActiveListId] = useState<string | null>(null)
  const [tasksState, setTasksState] = useState<DeferredLoadState>('idle')
  const [tasksErrorMessage, setTasksErrorMessage] = useState<string | null>(null)
  const [tasksHaveMore, setTasksHaveMore] = useState(false)
  const [mutatingTaskId, setMutatingTaskId] = useState<string | null>(null)
  const [creatingTask, setCreatingTask] = useState(false)

  const [calendarWork, setCalendarWork] = useState<WorkMyWork | null>(null)
  const [calendars, setCalendars] = useState<WorkCalendar[]>([])
  const [calendarState, setCalendarState] =
    useState<DeferredLoadState>('idle')
  const [calendarErrorMessage, setCalendarErrorMessage] = useState<string | null>(
    null
  )
  const [calendarView, setCalendarView] = useState<WorkCalendarView>('month')
  const [calendarAnchor, setCalendarAnchor] = useState(() => new Date())
  const [activeCalendarId, setActiveCalendarId] = useState<string | null>(null)

  const workRef = useRef<WorkMyWork | null>(null)
  const generationRef = useRef(0)
  const tasksGenerationRef = useRef(0)
  const calendarGenerationRef = useRef(0)

  const load = useCallback(async () => {
    const generation = ++generationRef.current
    if (!workRef.current) setState('loading')
    setErrorMessage(null)

    const result = await browserWork.myWork.retrieve(currentDayWindow())
    if (generation !== generationRef.current) return

    if (result.error || !result.data) {
      setState('error')
      setErrorMessage(
        result.error?.message ?? 'Work could not be loaded. Try again.'
      )
      return
    }

    workRef.current = result.data
    setWork(result.data)
    setState('ready')
  }, [])

  const loadTasks = useCallback(async (listId: string | null) => {
    const generation = ++tasksGenerationRef.current
    setTasksState('loading')
    setTasksErrorMessage(null)

    const [listsResult, tasksResult] = await Promise.all([
      browserWork.taskLists.list(),
      browserWork.tasks.list(listId ? { listId } : {}),
    ])
    if (generation !== tasksGenerationRef.current) return

    if (listsResult.data) setTaskLists(listsResult.data.data)

    if (listsResult.error || tasksResult.error || !tasksResult.data) {
      setTasksState('error')
      setTasksErrorMessage(
        listsResult.error?.message ??
          tasksResult.error?.message ??
          'Tasks could not be loaded. Try again.'
      )
      return
    }

    setTaskLists(listsResult.data?.data ?? [])
    setTasks(tasksResult.data.data)
    setTasksHaveMore(tasksResult.data.has_more)
    setTasksState('ready')
  }, [])

  const loadCalendar = useCallback(
    async (nextView: WorkCalendarView, anchor: Date) => {
      const generation = ++calendarGenerationRef.current
      setCalendarState('loading')
      setCalendarErrorMessage(null)

      const [calendarsResult, workResult] = await Promise.all([
        browserWork.calendars.list(),
        browserWork.myWork.retrieve(calendarWindow(nextView, anchor)),
      ])
      if (generation !== calendarGenerationRef.current) return

      if (calendarsResult.data) setCalendars(calendarsResult.data.data)

      if (calendarsResult.error || workResult.error || !workResult.data) {
        setCalendarState('error')
        setCalendarErrorMessage(
          calendarsResult.error?.message ??
            workResult.error?.message ??
            'Calendar could not be loaded. Try again.'
        )
        return
      }

      setCalendars(calendarsResult.data?.data ?? [])
      setCalendarWork(workResult.data)
      setCalendarState('ready')
    },
    []
  )

  useEffect(() => {
    void load()
  }, [load])

  const changeView = useCallback(
    (nextView: WorkView) => {
      setView(nextView)
      if (nextView === 'tasks' && tasksState === 'idle')
        void loadTasks(activeListId)
      if (nextView === 'calendar' && calendarState === 'idle')
        void loadCalendar(calendarView, calendarAnchor)
    },
    [
      activeListId,
      calendarAnchor,
      calendarState,
      calendarView,
      loadCalendar,
      loadTasks,
      tasksState,
    ]
  )

  const selectTaskList = useCallback(
    (listId: string | null) => {
      setActiveListId(listId)
      void loadTasks(listId)
    },
    [loadTasks]
  )

  const changeCalendarView = useCallback(
    (nextView: WorkCalendarView) => {
      setCalendarView(nextView)
      void loadCalendar(nextView, calendarAnchor)
    },
    [calendarAnchor, loadCalendar]
  )

  const navigateCalendar = useCallback(
    (direction: 'previous' | 'today' | 'next') => {
      const nextAnchor = moveCalendarAnchor(calendarView, calendarAnchor, direction)
      setCalendarAnchor(nextAnchor)
      void loadCalendar(calendarView, nextAnchor)
    },
    [calendarAnchor, calendarView, loadCalendar]
  )

  const applyTaskResult = useCallback((updatedTask: WorkTask) => {
    setTasks((current) =>
      current.map((item) => (item.id === updatedTask.id ? updatedTask : item))
    )
    setWork((current) => {
      if (!current) return current
      const terminal =
        updatedTask.status === 'DONE' || updatedTask.status === 'CANCELLED'
      return {
        ...current,
        tasks: current.tasks.map((item) =>
          item.id === updatedTask.id ? updatedTask : item
        ),
        overdueTasks: terminal
          ? current.overdueTasks.filter((item) => item.id !== updatedTask.id)
          : current.overdueTasks.map((item) =>
              item.id === updatedTask.id ? updatedTask : item
            ),
      }
    })
  }, [])

  const refreshAfterTaskMutation = useCallback(async () => {
    const refreshes: Promise<void>[] = [load()]
    if (tasksState !== 'idle') refreshes.push(loadTasks(activeListId))
    if (calendarState !== 'idle')
      refreshes.push(loadCalendar(calendarView, calendarAnchor))
    await Promise.all(refreshes)
  }, [
    activeListId,
    calendarAnchor,
    calendarState,
    calendarView,
    load,
    loadCalendar,
    loadTasks,
    tasksState,
  ])

  const taskMutationError = useCallback(
    (message: string) => {
      if (view === 'tasks') {
        setTasksState('error')
        setTasksErrorMessage(message)
      } else {
        setState('error')
        setErrorMessage(message)
      }
    },
    [view]
  )

  const runTaskMutation = useCallback(
    async (
      task: WorkTask,
      operation: () => ReturnType<typeof browserWork.tasks.complete>
    ): Promise<boolean> => {
      if (mutatingTaskId) return false

      setMutatingTaskId(task.id)
      setErrorMessage(null)
      setTasksErrorMessage(null)
      const result = await operation()

      if (result.error || !result.data) {
        taskMutationError(
          result.error?.message ?? 'The task could not be updated. Try again.'
        )
        setMutatingTaskId(null)
        return false
      }

      const updatedTask = result.data
      applyTaskResult(updatedTask)
      setMutatingTaskId(null)
      await refreshAfterTaskMutation()
      return true
    },
    [applyTaskResult, mutatingTaskId, refreshAfterTaskMutation, taskMutationError]
  )

  const createTask = useCallback(
    async (input: WorkTaskDraft): Promise<boolean> => {
      if (creatingTask) return false
      setCreatingTask(true)
      setTasksErrorMessage(null)

      const result = await browserWork.tasks.create(input)
      if (result.error || !result.data) {
        setTasksState('error')
        setTasksErrorMessage(
          result.error?.message ?? 'The task could not be created. Try again.'
        )
        setCreatingTask(false)
        return false
      }

      setCreatingTask(false)
      await refreshAfterTaskMutation()
      return true
    },
    [creatingTask, refreshAfterTaskMutation]
  )

  const updateTask = useCallback(
    (task: WorkTask, input: WorkTaskEdit) =>
      runTaskMutation(task, () => browserWork.tasks.update(task.id, input)),
    [runTaskMutation]
  )

  const completeTask = useCallback(
    (task: WorkTask) =>
      runTaskMutation(task, () => browserWork.tasks.complete(task.id)).then(
        () => undefined
      ),
    [runTaskMutation]
  )

  const cancelTask = useCallback(
    (task: WorkTask) =>
      runTaskMutation(task, () => browserWork.tasks.cancel(task.id)).then(
        () => undefined
      ),
    [runTaskMutation]
  )

  if (state === 'loading' && !work)
    return <WidgetPanelSkeleton label="Loading Work" />

  if (state === 'error' && !work)
    return (
      <div className="flex h-full flex-col items-center justify-center px-6 text-center">
        <p className="text-sm font-medium">Unable to load Work</p>
        <p className="text-muted-foreground mt-1 max-w-72 text-xs leading-5">
          {errorMessage}
        </p>
        <button
          type="button"
          onClick={() => void load()}
          className="border-876-surface-border bg-876-surface mt-4 rounded-lg border px-3 py-2 text-xs font-medium shadow-xs"
        >
          Try again
        </button>
      </div>
    )

  if (!work) return <WidgetPanelSkeleton label="Loading Work" />

  return (
    <div className="min-h-full">
      <WorkViewNav view={view} onChange={changeView} />

      {view === 'today' ? (
        <>
          {state === 'error' ? (
            <ErrorBanner message={errorMessage} onRetry={() => void load()} />
          ) : null}
          <WorkToday
            work={work}
            completingTaskId={mutatingTaskId}
            onCompleteTask={completeTask}
          />
        </>
      ) : view === 'tasks' ? (
        tasksState === 'loading' || tasksState === 'idle' ? (
          <WidgetPanelSkeleton label="Loading tasks" />
        ) : (
          <>
            {tasksState === 'error' ? (
              <ErrorBanner
                message={tasksErrorMessage}
                onRetry={() => void loadTasks(activeListId)}
              />
            ) : null}
            <WorkTasks
              taskLists={taskLists}
              tasks={tasks}
              activeListId={activeListId}
              onSelectList={selectTaskList}
              mutatingTaskId={mutatingTaskId}
              creatingTask={creatingTask}
              onCreateTask={createTask}
              onUpdateTask={updateTask}
              onCompleteTask={completeTask}
              onCancelTask={cancelTask}
              hasMore={tasksHaveMore}
            />
          </>
        )
      ) : calendarState === 'loading' || calendarState === 'idle' ? (
        <WidgetPanelSkeleton label="Loading calendar" />
      ) : calendarWork ? (
        <>
          {calendarState === 'error' ? (
            <ErrorBanner
              message={calendarErrorMessage}
              onRetry={() => void loadCalendar(calendarView, calendarAnchor)}
            />
          ) : null}
          <WorkCalendarSurface
            work={calendarWork}
            calendars={calendars}
            view={calendarView}
            anchorDate={calendarAnchor}
            activeCalendarId={activeCalendarId}
            onChangeView={changeCalendarView}
            onNavigate={navigateCalendar}
            onSelectCalendar={setActiveCalendarId}
          />
        </>
      ) : (
        <div className="p-6 text-center">
          <p className="text-sm font-medium">Unable to load Calendar</p>
          <p className="text-muted-foreground mt-1 text-xs">
            {calendarErrorMessage}
          </p>
          <button
            type="button"
            onClick={() => void loadCalendar(calendarView, calendarAnchor)}
            className="mt-3 text-xs font-medium underline underline-offset-2"
          >
            Try again
          </button>
        </div>
      )}
    </div>
  )
}
