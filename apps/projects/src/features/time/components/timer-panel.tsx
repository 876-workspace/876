'use client'

import { TimerBar } from '@876/projects-ui/timer-bar'
import { AppError, type AppErrorValue } from '@876/ui/app-error'
import { NativeSelect } from '@876/ui/native-select'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { timeClient } from '@/lib/client/time'

import type { TimeEntryProjectOption } from './time-entry-form'
import { IDLE_TIMER_LABEL, timerLabel, type TimerState } from './timer-state'

type Props = {
  timer: TimerState
  projects: readonly TimeEntryProjectOption[]
  /** Set when the page is about one project: the bar starts timers on it. */
  fixedProjectId?: string | null
  disabled: boolean
}

/**
 * The running timer for the signed-in user, wherever it is running.
 *
 * The bar holds the state an action just produced so it flips at once; the
 * lists around it are re-read from the server, which stays the authority.
 */
export function TimerPanel({
  timer,
  projects,
  fixedProjectId = null,
  disabled,
}: Props) {
  const router = useRouter()
  const [current, setCurrent] = useState(timer)
  const [selectedProjectId, setSelectedProjectId] = useState(
    fixedProjectId ?? projects[0]?.id ?? ''
  )
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<AppErrorValue | null>(null)

  function nameOf(projectId: string): string | undefined {
    return projects.find((project) => project.id === projectId)?.name
  }

  async function start() {
    if (pending) return

    const projectId = fixedProjectId ?? selectedProjectId
    if (!projectId) {
      setError({
        code: 'projects/time-timer-project-required',
        message: 'Choose a project to track time against.',
      })
      return
    }

    setPending(true)
    setError(null)
    const result = await timeClient.startTimer({ projectId })
    setPending(false)

    if (result.error || !result.data) {
      setError(
        result.error ?? {
          code: 'projects/timer-start-failed',
          message: 'The timer could not be started.',
        }
      )
      return
    }

    setCurrent({
      running: true,
      startedAt: result.data.started.startedAt,
      label: timerLabel(nameOf(projectId)),
    })
    router.refresh()
  }

  async function stop() {
    if (pending) return

    setPending(true)
    setError(null)
    const result = await timeClient.stopTimer()
    setPending(false)

    if (result.error || !result.data) {
      setError(
        result.error ?? {
          code: 'projects/timer-stop-failed',
          message: 'The timer could not be stopped.',
        }
      )
      return
    }

    setCurrent({ running: false, startedAt: null, label: IDLE_TIMER_LABEL })
    router.refresh()
  }

  return (
    <div className="space-y-3">
      {error ? (
        <AppError
          title="The timer was not updated"
          error={error}
          variant="banner"
        />
      ) : null}

      {fixedProjectId ? null : (
        <div className="flex items-center gap-2">
          <label htmlFor="timer-project" className="text-muted-foreground text-sm">
            Project
          </label>
          <NativeSelect
            id="timer-project"
            value={selectedProjectId}
            onChange={(event) => setSelectedProjectId(event.target.value)}
            className="w-64"
          >
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </NativeSelect>
        </div>
      )}

      <TimerBar
        running={current.running}
        startedAt={current.startedAt}
        label={current.label}
        onStart={start}
        onStop={stop}
        disabled={disabled || pending}
      />
    </div>
  )
}
