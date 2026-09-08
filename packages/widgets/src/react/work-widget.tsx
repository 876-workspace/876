'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { WorkMyWork, WorkTask, WorkTaskList } from '@876/work'
import { browserWork } from '@876/work/browser'
import { WorkTasks } from '@876/work-ui/tasks'
import { WorkToday } from '@876/work-ui/today'

import { WidgetPanelSkeleton } from './widget-loading'

type LoadState = 'loading' | 'ready' | 'error'
type DeferredLoadState = 'idle' | LoadState
type WorkView = 'today' | 'tasks'

export function currentDayWindow(now = new Date()) {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)

  return {
    from: Math.floor(start.getTime() / 1000),
    to: Math.floor(end.getTime() / 1000),
  }
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
      {(['today', 'tasks'] as const).map((item) => (
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
  const [completingTaskId, setCompletingTaskId] = useState<string | null>(null)
  const workRef = useRef<WorkMyWork | null>(null)
  const generationRef = useRef(0)
  const tasksGenerationRef = useRef(0)

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

  useEffect(() => {
    void load()
  }, [load])

  const changeView = useCallback(
    (nextView: WorkView) => {
      setView(nextView)
      if (nextView === 'tasks' && tasksState === 'idle')
        void loadTasks(activeListId)
    },
    [activeListId, loadTasks, tasksState]
  )

  const selectTaskList = useCallback(
    (listId: string | null) => {
      setActiveListId(listId)
      void loadTasks(listId)
    },
    [loadTasks]
  )

  const completeTask = useCallback(
    async (task: WorkTask) => {
      if (completingTaskId) return

      setCompletingTaskId(task.id)
      setErrorMessage(null)
      setTasksErrorMessage(null)
      const result = await browserWork.tasks.complete(task.id)

      if (result.error || !result.data) {
        const message =
          result.error?.message ?? 'The task could not be completed. Try again.'
        if (view === 'tasks') {
          setTasksState('error')
          setTasksErrorMessage(message)
        } else {
          setState('error')
          setErrorMessage(message)
        }
        setCompletingTaskId(null)
        return
      }

      setWork((current) =>
        current
          ? {
              ...current,
              tasks: current.tasks.filter((item) => item.id !== task.id),
              overdueTasks: current.overdueTasks.filter(
                (item) => item.id !== task.id
              ),
            }
          : current
      )
      setTasks((current) =>
        current.map((item) => (item.id === task.id ? result.data! : item))
      )
      setCompletingTaskId(null)

      if (view === 'tasks') await loadTasks(activeListId)
      else await load()
    },
    [activeListId, completingTaskId, load, loadTasks, view]
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
            completingTaskId={completingTaskId}
            onCompleteTask={completeTask}
          />
        </>
      ) : tasksState === 'loading' || tasksState === 'idle' ? (
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
            completingTaskId={completingTaskId}
            onCompleteTask={completeTask}
            hasMore={tasksHaveMore}
          />
        </>
      )}
    </div>
  )
}
