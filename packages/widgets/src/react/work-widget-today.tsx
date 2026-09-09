'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { WorkMyWork, WorkTask } from '@876/work'
import { browserWork } from '@876/work/browser'
import { WorkToday } from '@876/work-ui/today'

import type { WorkWidgetCapabilities } from '../work-capabilities'
import { WidgetPanelSkeleton } from './widget-loading'
import { WorkWidgetErrorBanner, WorkWidgetInitialError } from './work-widget-feedback'
import { currentDayWindow } from './work-widget-time'

type LoadState = 'loading' | 'ready' | 'error'

export function WorkWidgetTodayView({
  capabilities,
}: {
  capabilities: WorkWidgetCapabilities
}) {
  const [work, setWork] = useState<WorkMyWork | null>(null)
  const [state, setState] = useState<LoadState>('loading')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [mutatingTaskId, setMutatingTaskId] = useState<string | null>(null)

  const workRef = useRef<WorkMyWork | null>(null)
  const generationRef = useRef(0)
  const mutationRef = useRef<string | null>(null)

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

  useEffect(() => {
    void load()
  }, [load])

  const completeTask = useCallback(
    async (task: WorkTask) => {
      if (!capabilities.canEditTasks || mutationRef.current) return

      mutationRef.current = task.id
      setMutatingTaskId(task.id)
      setErrorMessage(null)

      const result = await browserWork.tasks.complete(task.id)
      if (result.error || !result.data) {
        setState('error')
        setErrorMessage(
          result.error?.message ?? 'The task could not be updated. Try again.'
        )
        mutationRef.current = null
        setMutatingTaskId(null)
        return
      }

      const updatedTask = result.data
      setWork((current) => {
        if (!current) return current
        const terminal =
          updatedTask.status === 'DONE' || updatedTask.status === 'CANCELLED'
        const next = {
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
        workRef.current = next
        return next
      })

      mutationRef.current = null
      setMutatingTaskId(null)
      await load()
    },
    [capabilities.canEditTasks, load]
  )

  if (state === 'loading' && !work)
    return <WidgetPanelSkeleton label="Loading Work" />

  if (state === 'error' && !work)
    return (
      <WorkWidgetInitialError
        title="Unable to load Work"
        message={errorMessage}
        onRetry={() => void load()}
      />
    )

  if (!work) return <WidgetPanelSkeleton label="Loading Work" />

  return (
    <>
      {state === 'error' ? (
        <WorkWidgetErrorBanner
          message={errorMessage}
          onAction={() => void load()}
        />
      ) : null}
      <WorkToday
        work={work}
        completingTaskId={mutatingTaskId}
        onCompleteTask={
          capabilities.canEditTasks ? completeTask : undefined
        }
      />
    </>
  )
}
