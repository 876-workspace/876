import type { TimeEntry, Timesheet } from '@876/projects/contracts'
import { describe, expect, it } from 'vitest'

import {
  entriesInPeriod,
  newestTimesheetFirst,
  timesheetForPeriod,
  toEntriesByTimesheet,
  toTimesheetSummaryEntries,
} from './time-summary-rows'

function entry(overrides: Partial<TimeEntry> = {}): TimeEntry {
  return {
    object: 'projects.time-entry',
    id: 'tme_1',
    tenantId: 'tnt_1',
    projectId: 'prj_1',
    issueId: null,
    milestoneId: null,
    taskListId: null,
    userId: 'usr_1',
    startedAt: 1704273300,
    endedAt: 1704282300,
    durationMinutes: 150,
    billable: false,
    note: null,
    approvalStatus: 'submitted',
    timesheetId: 'tsh_1',
    createdBy: 'usr_1',
    createdAt: 1704273300,
    updatedAt: 1704273300,
    ...overrides,
  }
}

function timesheet(overrides: Partial<Timesheet> = {}): Timesheet {
  return {
    object: 'projects.timesheet',
    id: 'tsh_1',
    tenantId: 'tnt_1',
    userId: 'usr_1',
    periodStart: 1704067200,
    periodEnd: 1704671999,
    status: 'draft',
    submittedAt: null,
    decidedAt: null,
    decidedBy: null,
    note: null,
    createdAt: 1704273300,
    updatedAt: 1704273300,
    ...overrides,
  }
}

const NAMES = new Map([['prj_1', 'Website rebuild']])

describe('toTimesheetSummaryEntries', () => {
  it('projects each entry onto the summary, naming its project', () => {
    expect(toTimesheetSummaryEntries([entry()], NAMES)).toEqual([
      {
        id: 'tme_1',
        startedAt: 1704273300,
        durationMinutes: 150,
        billable: false,
        projectId: 'prj_1',
        projectName: 'Website rebuild',
      },
    ])
  })

  it('reports a still-running entry as nothing logged yet', () => {
    expect(
      toTimesheetSummaryEntries([entry({ durationMinutes: null })], NAMES)[0]
        .durationMinutes
    ).toBe(0)
  })
})

describe('toEntriesByTimesheet', () => {
  it('hands the grouping over as a plain record', () => {
    expect(toEntriesByTimesheet([entry()], NAMES)).toEqual({
      tsh_1: [
        {
          id: 'tme_1',
          startedAt: 1704273300,
          durationMinutes: 150,
          billable: false,
          projectId: 'prj_1',
          projectName: 'Website rebuild',
        },
      ],
    })
  })

  it('groups the entries a sheet carries by that sheet', () => {
    const byTimesheet = toEntriesByTimesheet(
      [
        entry({ id: 'tme_1' }),
        entry({ id: 'tme_2' }),
        entry({ id: 'tme_3', timesheetId: 'tsh_2' }),
      ],
      NAMES
    )

    expect(byTimesheet.tsh_1?.map(({ id }) => id)).toEqual(['tme_1', 'tme_2'])
    expect(byTimesheet.tsh_2?.map(({ id }) => id)).toEqual(['tme_3'])
  })

  it('leaves out entries that belong to no sheet', () => {
    expect(
      toEntriesByTimesheet([entry({ timesheetId: null })], NAMES)
    ).toEqual({})
  })
})

describe('timesheetForPeriod', () => {
  it('finds the sheet that covers exactly the period', () => {
    const sheet = timesheet()

    expect(
      timesheetForPeriod([sheet], { from: 1704067200, to: 1704671999 })
    ).toBe(sheet)
  })

  it('finds no sheet when the period differs', () => {
    expect(
      timesheetForPeriod([timesheet()], { from: 1704067200, to: 1704153600 })
    ).toBeNull()
  })
})

describe('newestTimesheetFirst', () => {
  it('orders the sheets by the period they cover', () => {
    const older = timesheet({ id: 'tsh_old', periodStart: 1704067200 })
    const newer = timesheet({ id: 'tsh_new', periodStart: 1704672000 })

    expect(
      newestTimesheetFirst([older, newer]).map(({ id }) => id)
    ).toEqual(['tsh_new', 'tsh_old'])
  })
})

describe('entriesInPeriod', () => {
  it('keeps the entries inside the period on both bounds', () => {
    const first = entry({ id: 'tme_first', startedAt: 1704067200 })
    const last = entry({ id: 'tme_last', startedAt: 1704671999 })
    const outside = entry({ id: 'tme_outside', startedAt: 1704672000 })

    expect(
      entriesInPeriod([first, last, outside], {
        from: 1704067200,
        to: 1704671999,
      }).map(({ id }) => id)
    ).toEqual(['tme_first', 'tme_last'])
  })
})
