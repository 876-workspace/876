'use client'

import { cn } from '@876/core/utils'
import { Button } from '@876/ui/button'
import { Clock } from '@876/ui/icons'
import { useSyncExternalStore } from 'react'

import { formatDuration } from './time-tracking'

export type TimerBarProps = {
  running: boolean
  startedAt: number | null
  label: string
  onStart: () => void
  onStop: () => void
  disabled: boolean
}

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

function formatElapsed(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const remainder = seconds % 60
  if (hours === 0) return `${pad(minutes)}:${pad(remainder)}`

  return `${hours}:${pad(minutes)}:${pad(remainder)}`
}

/**
 * The accessible name of the running clock moves once a minute while the
 * visible one moves once a second, so a screen reader is never woken by a tick.
 */
function formatElapsedLabel(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  if (minutes === 0) return 'Elapsed less than a minute'

  return `Elapsed ${formatDuration(minutes)}`
}

const TICK_MS = 1000

function subscribeToClock(listener: () => void) {
  const interval = setInterval(listener, TICK_MS)

  return () => clearInterval(interval)
}

function subscribeToNothing() {
  return () => {}
}

function clockSecond(): number {
  return Math.floor(Date.now() / 1000)
}

/**
 * The server and the hydration pass render the clock at zero, then the real
 * time takes over — a running timer never disagrees with its own markup.
 */
function serverSecond(): number {
  return 0
}

export function TimerBar({
  running,
  startedAt,
  label,
  onStart,
  onStop,
  disabled,
}: TimerBarProps) {
  const now = useSyncExternalStore(
    running ? subscribeToClock : subscribeToNothing,
    clockSecond,
    serverSecond
  )

  // Elapsed time is display only: the server derives and stores the duration.
  const elapsedSeconds =
    running && startedAt !== null ? Math.max(0, now - startedAt) : 0

  return (
    <section
      data-timer-bar
      className={cn(
        '876-card flex flex-wrap items-center justify-between gap-3 px-4 py-3',
        running && 'ring-info/40 ring-1'
      )}
    >
      <div className="flex min-w-0 items-center gap-2">
        <Clock
          aria-hidden="true"
          className={cn(
            'size-4 shrink-0',
            running ? 'text-info' : 'text-muted-foreground'
          )}
        />
        <span
          data-timer-label
          className={cn(
            'truncate',
            running ? 'font-medium' : 'text-muted-foreground'
          )}
        >
          {label}
        </span>
        <span
          data-timer-elapsed
          aria-live="off"
          aria-label={
            running ? formatElapsedLabel(elapsedSeconds) : 'No timer running'
          }
          className="text-muted-foreground ml-1 font-mono text-sm tabular-nums"
        >
          {formatElapsed(elapsedSeconds)}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="info"
          size="sm"
          disabled={disabled || running}
          onClick={onStart}
        >
          Start
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled || !running}
          onClick={onStop}
        >
          Stop
        </Button>
      </div>
    </section>
  )
}
