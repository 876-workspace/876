import { describe, expect, it } from 'vitest'

import {
  activityListSchema,
  customRecordGetSchema,
  customRecordsListSchema,
  cycleGetSchema,
  cyclesListSchema,
  phaseGetSchema,
  phasesListSchema,
  reportBudgetVarianceSchema,
  reportHealthSchema,
  reportTimeSchema,
  reportWorkloadSchema,
  reportWorkSchema,
  taskListsListSchema,
  templateGetSchema,
  templatesListSchema,
  timeEntriesListSchema,
  timeEntryCreateSchema,
  timeSummaryQuerySchema,
  wikiPageGetSchema,
} from './schemas'

describe('rollout input schemas', () => {
  it('phases_list accepts empty filters and rejects unknown status', () => {
    expect(phasesListSchema.safeParse({}).success).toBe(true)
    expect(
      phasesListSchema.safeParse({ projectId: 'prj_1', status: 'open' }).success
    ).toBe(true)
    expect(phasesListSchema.safeParse({ status: 'bogus' }).success).toBe(false)
    expect(
      phasesListSchema.safeParse({ projectId: 'prj_1', extra: true }).success
    ).toBe(false)
  })

  it('phase_get requires a phase identifier', () => {
    expect(phaseGetSchema.safeParse({ phase: 'ms_1' }).success).toBe(true)
    expect(phaseGetSchema.safeParse({}).success).toBe(false)
    expect(phaseGetSchema.safeParse({ phase: '' }).success).toBe(false)
    expect(
      phaseGetSchema.safeParse({ phase: 'ms_1', extra: true }).success
    ).toBe(false)
  })

  it('cycles_list accepts optional filters and rejects unknown status', () => {
    expect(cyclesListSchema.safeParse({}).success).toBe(true)
    expect(
      cyclesListSchema.safeParse({ projectId: 'prj_1', status: 'active' })
        .success
    ).toBe(true)
    expect(cyclesListSchema.safeParse({ status: 'bogus' }).success).toBe(false)
    expect(cyclesListSchema.safeParse({ extra: true }).success).toBe(false)
  })

  it('cycle_get requires a cycle identifier', () => {
    expect(cycleGetSchema.safeParse({ cycle: 'cyc_1' }).success).toBe(true)
    expect(cycleGetSchema.safeParse({}).success).toBe(false)
    expect(
      cycleGetSchema.safeParse({ cycle: 'cyc_1', extra: true }).success
    ).toBe(false)
  })

  it('task_lists_list requires a project', () => {
    expect(taskListsListSchema.safeParse({ projectId: 'prj_1' }).success).toBe(
      true
    )
    expect(taskListsListSchema.safeParse({}).success).toBe(false)
    expect(
      taskListsListSchema.safeParse({ projectId: 'prj_1', extra: true }).success
    ).toBe(false)
  })

  it('time_entries_list accepts filters and converts ISO windows', () => {
    const parsed = timeEntriesListSchema.safeParse({
      projectId: 'prj_1',
      from: '2026-09-01T00:00:00.000Z',
      to: 1789000000,
      billable: true,
      approvalStatus: 'approved',
    })
    expect(parsed.success).toBe(true)
    if (parsed.success) {
      expect(parsed.data.from).toBe(
        Math.floor(Date.parse('2026-09-01T00:00:00.000Z') / 1000)
      )
    }
    expect(
      timeEntriesListSchema.safeParse({ approvalStatus: 'bogus' }).success
    ).toBe(false)
    expect(timeEntriesListSchema.safeParse({ extra: true }).success).toBe(false)
  })

  it('time_summary requires groupBy and a valid window', () => {
    expect(
      timeSummaryQuerySchema.safeParse({
        groupBy: 'project',
        from: 1788400000,
        to: 1789000000,
      }).success
    ).toBe(true)
    expect(
      timeSummaryQuerySchema.safeParse({ groupBy: 'project', from: 1788400000 })
        .success
    ).toBe(false)
    expect(
      timeSummaryQuerySchema.safeParse({
        groupBy: 'bogus',
        from: 1788400000,
        to: 1789000000,
      }).success
    ).toBe(false)
    expect(
      timeSummaryQuerySchema.safeParse({
        groupBy: 'project',
        from: 'not-a-date',
        to: 1789000000,
      }).success
    ).toBe(false)
  })

  it('report schemas require windows except health', () => {
    expect(
      reportWorkSchema.safeParse({ from: 1788400000, to: 1789000000 }).success
    ).toBe(true)
    expect(reportWorkSchema.safeParse({ from: 1788400000 }).success).toBe(false)
    expect(reportHealthSchema.safeParse({}).success).toBe(true)
    expect(reportHealthSchema.safeParse({ extra: true }).success).toBe(false)
    expect(
      reportTimeSchema.safeParse({
        groupBy: 'user',
        from: 1788400000,
        to: 1789000000,
      }).success
    ).toBe(true)
    expect(
      reportTimeSchema.safeParse({
        groupBy: 'day',
        from: 1788400000,
        to: 1789000000,
      }).success
    ).toBe(false)
    expect(
      reportBudgetVarianceSchema.safeParse({ from: 1788400000, to: 1789000000 })
        .success
    ).toBe(true)
    expect(
      reportWorkloadSchema.safeParse({ from: 1788400000, to: 1789000000 })
        .success
    ).toBe(true)
  })

  it('templates_list and template_get validate identifiers', () => {
    expect(templatesListSchema.safeParse({}).success).toBe(true)
    expect(templatesListSchema.safeParse({ extra: true }).success).toBe(false)
    expect(templateGetSchema.safeParse({ template: 'tpl_1' }).success).toBe(
      true
    )
    expect(templateGetSchema.safeParse({}).success).toBe(false)
  })

  it('custom records schemas require module scope', () => {
    expect(customRecordsListSchema.safeParse({ module: 'mcm_1' }).success).toBe(
      true
    )
    expect(customRecordsListSchema.safeParse({}).success).toBe(false)
    expect(
      customRecordsListSchema.safeParse({ module: 'mcm_1', limit: 101 }).success
    ).toBe(false)
    expect(
      customRecordGetSchema.safeParse({ module: 'mcm_1', record: 'mcr_1' })
        .success
    ).toBe(true)
    expect(customRecordGetSchema.safeParse({ module: 'mcm_1' }).success).toBe(
      false
    )
  })

  it('activity_list requires a project and bounds limit', () => {
    expect(activityListSchema.safeParse({ projectId: 'prj_1' }).success).toBe(
      true
    )
    expect(activityListSchema.safeParse({}).success).toBe(false)
    expect(
      activityListSchema.safeParse({ projectId: 'prj_1', limit: 101 }).success
    ).toBe(false)
    expect(
      activityListSchema.safeParse({ projectId: 'prj_1', extra: true }).success
    ).toBe(false)
  })

  it('wiki_page_get requires project and page', () => {
    expect(
      wikiPageGetSchema.safeParse({ projectId: 'prj_1', page: 'home' }).success
    ).toBe(true)
    expect(wikiPageGetSchema.safeParse({ projectId: 'prj_1' }).success).toBe(
      false
    )
    expect(
      wikiPageGetSchema.safeParse({
        projectId: 'prj_1',
        page: 'home',
        extra: true,
      }).success
    ).toBe(false)
  })

  it('time_entry_create requires project and window', () => {
    expect(
      timeEntryCreateSchema.safeParse({
        projectId: 'prj_1',
        startedAt: 1788400000,
        endedAt: 1788403600,
      }).success
    ).toBe(true)
    expect(
      timeEntryCreateSchema.safeParse({
        startedAt: 1788400000,
        endedAt: 1788403600,
      }).success
    ).toBe(false)
    expect(
      timeEntryCreateSchema.safeParse({
        projectId: 'prj_1',
        startedAt: 1788400000,
      }).success
    ).toBe(false)
    expect(
      timeEntryCreateSchema.safeParse({
        projectId: 'prj_1',
        startedAt: 1788400000,
        endedAt: 1788403600,
        extra: true,
      }).success
    ).toBe(false)
  })
})
