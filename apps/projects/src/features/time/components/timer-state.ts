import type { TimeEntry } from '@876/projects/contracts'

export type TimerState = {
  running: boolean
  startedAt: number | null
  label: string
}

export const IDLE_TIMER_LABEL = 'No timer running'

/**
 * The bar names the project the running timer belongs to, so a viewer on a
 * different project still knows where their time is going.
 */
export function timerLabel(projectName: string | null | undefined): string {
  return projectName ? `Tracking ${projectName}` : 'Tracking another project'
}

export function toTimerState(
  entry: TimeEntry | null,
  projectNames: ReadonlyMap<string, string>
): TimerState {
  if (!entry) return { running: false, startedAt: null, label: IDLE_TIMER_LABEL }

  return {
    running: true,
    startedAt: entry.startedAt,
    label: timerLabel(projectNames.get(entry.projectId)),
  }
}
