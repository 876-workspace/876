import type { TimeEntry } from '@876/projects/contracts'
import { describe, expect, it } from 'vitest'

import { toApprovalStatus, toTimeEntryRows } from './time-entry-rows'

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
    billable: true,
    note: 'Wrote the migration',
    approvalStatus: 'draft',
    timesheetId: null,
    createdBy: 'usr_1',
    createdAt: 1704273300,
    updatedAt: 1704273300,
    ...overrides,
  }
}

const LOOKUPS = {
  projectNames: new Map([['prj_1', 'Website rebuild']]),
  issueTitles: new Map([['iss_1', 'Ship the header']]),
}

describe('toApprovalStatus', () => {
  it('keeps the four statuses the table badges', () => {
    expect(toApprovalStatus('submitted')).toBe('submitted')
    expect(toApprovalStatus('approved')).toBe('approved')
    expect(toApprovalStatus('rejected')).toBe('rejected')
    expect(toApprovalStatus('draft')).toBe('draft')
  })

  it('treats a status the table does not know as a draft', () => {
    expect(toApprovalStatus('locked')).toBe('draft')
  })
})

describe('toTimeEntryRows', () => {
  it('names the project and the work item the entry points at', () => {
    expect(
      toTimeEntryRows([entry({ issueId: 'iss_1' })], LOOKUPS)[0]
    ).toMatchObject({
      id: 'tme_1',
      durationMinutes: 150,
      projectName: 'Website rebuild',
      issue: { id: 'iss_1', title: 'Ship the header' },
      billable: true,
    })
  })

  it('leaves the work item empty when the entry has none', () => {
    expect(toTimeEntryRows([entry()], LOOKUPS)[0].issue).toBeNull()
  })

  it('reports a running entry as nothing logged yet', () => {
    const rows = toTimeEntryRows(
      [entry({ endedAt: null, durationMinutes: null })],
      LOOKUPS
    )

    expect(rows[0].durationMinutes).toBe(0)
  })

  it('falls back to the references when a name is not in the lookups', () => {
    const rows = toTimeEntryRows(
      [entry({ projectId: 'prj_9', issueId: 'iss_9' })],
      LOOKUPS
    )

    expect(rows[0].projectName).toBe('prj_9')
    expect(rows[0].issue).toEqual({ id: 'iss_9', title: 'iss_9' })
  })
})
