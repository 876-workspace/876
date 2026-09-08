'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { WorkMyWork } from '@876/work'
import { browserWork } from '@876/work/browser'
import { WorkSummary } from '@876/work-ui/summary'

import { WidgetPanelSkeleton } from './widget-loading'

type LoadState = 'loading' | 'ready' | 'error'

function currentDayWindow(now = new Date()) {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)

  return {
    from: Math.floor(start.getTime() / 1000),
    to: Math.floor(end.getTime() / 1000) - 1,
  }
}

export function WorkWidgetPanel() {
  const [work, setWork] = useState<WorkMyWork | null>(null)
  const [state, setState] = useState<LoadState>('loading')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const generationRef = useRef(0)

  const load = useCallback(async () => {
    const generation = ++generationRef.current
    if (!work) setState('loading')
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

    setWork(result.data)
    setState('ready')
  }, [work])

  useEffect(() => {
    void load()
  }, [load])

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
      {state === 'error' ? (
        <div className="border-b border-amber-500/25 bg-amber-500/10 px-4 py-2 text-xs">
          {errorMessage}
          <button
            type="button"
            onClick={() => void load()}
            className="ml-2 font-medium underline underline-offset-2"
          >
            Try again
          </button>
        </div>
      ) : null}
      <WorkSummary work={work} />
    </div>
  )
}
