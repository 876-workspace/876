import type { TimeEntry } from '@876/projects/contracts'
import { describe, expect, it } from 'vitest'

import { IDLE_TIMER_LABEL, toTimerState } from './timer-state'

function running(projectId: string): TimeEntry {
  return {
    object: 'projects.time-entry',
    id: 'tme_1',
    tenantId: 'tnt_1',
    projectId,
    issueId: null,
    milestoneId: null,
    taskListId: null,
    userId: 'usr_1',
    startedAt: 1704273300,
    endedAt: null,
    durationMinutes: null,
    billable: false,
    note: null,
    approvalStatus: 'draft',
    timesheetId: null,
    createdBy: 'usr_1',
    createdAt: 1704273300,
    updatedAt: 1704273300,
  }
}

describe('toTimerState', () => {
  it('reports no timer when nothing is running', () => {
    expect(toTimerState(null, new Map())).toEqual({
      running: false,
      startedAt: null,
      label: IDLE_TIMER_LABEL,
    })
  })

  it('names the project the timer is running against', () => {
    expect(
      toTimerState(running('prj_1'), new Map([['prj_1', 'Website rebuild']]))
    ).toEqual({
      running: true,
      startedAt: 1704273300,
      label: 'Tracking Website rebuild',
    })
  })

  it('still reports a timer whose project the page cannot name', () => {
    expect(toTimerState(running('prj_9'), new Map()).label).toBe(
      'Tracking another project'
    )
  })
})
