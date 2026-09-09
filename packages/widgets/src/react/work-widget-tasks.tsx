'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { WorkTask, WorkTaskList } from '@876/work'
import { browserWork } from '@876/work/browser'
import {
  WorkTasks,
  type WorkTaskDraft,
  type WorkTaskEdit,
} from '@876/work-ui/tasks'

import type { WorkWidgetCapabilities } from '../work-capabilities'
import { WidgetPanelSkeleton } from './widget-loading'
import { WorkWidgetErrorBanner } from './work-widget-feedback'

type LoadState = 'loading' | 'ready' | 'error'

function appendUniqueTasks(current: WorkTask[], incoming: readonly WorkTask[]) {
  const byId = new Map(current.map((task) => [task.id, task]))
  for (const task of incoming) byId.set(task.id, task)
  return [...byId.values()]
}

export function WorkWidgetTasksView({
  capabilities,
}: {
  capabilities: WorkWidgetCapabilities
}) {
  const [taskLists, setTaskLists] = useState<WorkTaskList[]>([])
  const [tasks, setTasks] = useState<WorkTask[]>([])
  const [activeListId, setActiveListId] = useState<string | null>(null)
  const [state, setState] = useState<LoadState>('loading')
  const [loaded, setLoaded] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [enrichmentMessage, setEnrichmentMessage] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [mutatingTaskId, setMutatingTaskId] = useState<string | null>(null)
  const [creatingTask, setCreatingTask] = useState(false)

  const generationRef = useRef(0)
  const mutationRef = useRef<string | null>(null)
  const createRef = useRef(false)
  const loadMoreRef = useRef(false)

  const loadTaskLists = useCallback(async () => {
    setEnrichmentMessage(null)
    const result = await browserWork.taskLists.list()
    if (result.error || !result.data) {
      setEnrichmentMessage(
        result.error?.message ?? 'Task lists could not be loaded.'
      )
      return
    }
    setTaskLists(result.data.data)
  }, [])

  const loadTasks = useCallback(async (listId: string | null) => {
    const generation = ++generationRef.current
    if (!loaded) setState('loading')
    setErrorMessage(null)

    const result = await browserWork.tasks.list(listId ? { listId } : {})
    if (generation !== generationRef.current) return

    if (result.error || !result.data) {
      setState('error')
      setErrorMessage(
        result.error?.message ?? 'Tasks could not be loaded. Try again.'
      )
      return
    }

    setTasks(result.data.data)
    setHasMore(result.data.has_more)
    setLoaded(true)
    setState('ready')
  }, [loaded])

  useEffect(() => {
    void loadTaskLists()
    void loadTasks(null)
  }, [loadTaskLists, loadTasks])

  const selectTaskList = useCallback(
    (listId: string | null) => {
      setActiveListId(listId)
      void loadTasks(listId)
    },
    [loadTasks]
  )

  const loadMore = useCallback(async () => {
    if (!hasMore || loadMoreRef.current) return
    const cursor = tasks.at(-1)?.id
    if (!cursor) return

    loadMoreRef.current = true
    setLoadingMore(true)
    setErrorMessage(null)

    const result = await browserWork.tasks.list({
      ...(activeListId ? { listId: activeListId } : {}),
      startingAfter: cursor,
    })

    if (result.error || !result.data) {
      setState('error')
      setErrorMessage(
        result.error?.message ?? 'More tasks could not be loaded. Try again.'
      )
      loadMoreRef.current = false
      setLoadingMore(false)
      return
    }

    setTasks((current) => appendUniqueTasks(current, result.data.data))
    setHasMore(result.data.has_more)
    setState('ready')
    loadMoreRef.current = false
    setLoadingMore(false)
  }, [activeListId, hasMore, tasks])

  const applyTaskResult = useCallback((updatedTask: WorkTask) => {
    setTasks((current) =>
      current.map((task) => (task.id === updatedTask.id ? updatedTask : task))
    )
  }, [])

  const runTaskMutation = useCallback(
    async (
      task: WorkTask,
      operation: () => ReturnType<typeof browserWork.tasks.complete>
    ): Promise<boolean> => {
      if (mutationRef.current) return false

      mutationRef.current = task.id
      setMutatingTaskId(task.id)
      setErrorMessage(null)
      const result = await operation()

      if (result.error || !result.data) {
        setState('error')
        setErrorMessage(
          result.error?.message ?? 'The task could not be updated. Try again.'
        )
        mutationRef.current = null
        setMutatingTaskId(null)
        return false
      }

      applyTaskResult(result.data)
      mutationRef.current = null
      setMutatingTaskId(null)
      return true
    },
    [applyTaskResult]
  )

  const createTask = useCallback(
    async (input: WorkTaskDraft): Promise<boolean> => {
      if (!capabilities.canCreateTasks || createRef.current) return false

      createRef.current = true
      setCreatingTask(true)
      setErrorMessage(null)
      const result = await browserWork.tasks.create(input)

      if (result.error || !result.data) {
        setState('error')
        setErrorMessage(
          result.error?.message ?? 'The task could not be created. Try again.'
        )
        createRef.current = false
        setCreatingTask(false)
        return false
      }

      createRef.current = false
      setCreatingTask(false)
      await loadTasks(activeListId)
      return true
    },
    [activeListId, capabilities.canCreateTasks, loadTasks]
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

  if (state === 'loading' && !loaded)
    return <WidgetPanelSkeleton label="Loading tasks" />

  return (
    <>
      {state === 'error' ? (
        <WorkWidgetErrorBanner
          message={errorMessage}
          onRetry={() => void loadTasks(activeListId)}
        />
      ) : null}
      {enrichmentMessage ? (
        <WorkWidgetErrorBanner
          message={enrichmentMessage}
          onRetry={() => void loadTaskLists()}
        />
      ) : null}
      <WorkTasks
        taskLists={taskLists}
        tasks={tasks}
        activeListId={activeListId}
        onSelectList={selectTaskList}
        mutatingTaskId={mutatingTaskId}
        creatingTask={creatingTask}
        onCreateTask={capabilities.canCreateTasks ? createTask : undefined}
        onUpdateTask={capabilities.canEditTasks ? updateTask : undefined}
        onCompleteTask={capabilities.canEditTasks ? completeTask : undefined}
        onCancelTask={capabilities.canEditTasks ? cancelTask : undefined}
        hasMore={hasMore}
        loadingMore={loadingMore}
        onLoadMore={loadMore}
      />
    </>
  )
}
