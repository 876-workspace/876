import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { Config } from './config'
import {
  config,
  createClient,
  mockMilestone,
  textOf,
} from './handlers.test-fixtures'
import {
  handleActivityList,
  handleCustomModulesList,
  handleCustomRecordGet,
  handleCustomRecordsList,
  handleCycleGet,
  handleCyclesList,
  handleIssueComment,
  handleIssueCreate,
  handleIssueUpdate,
  handleLabelCreate,
  handlePhaseGet,
  handlePhasesList,
  handleProjectCreate,
  handleProjectUpdate,
  handleReportBudgetVariance,
  handleReportHealth,
  handleReportTime,
  handleReportWork,
  handleReportWorkload,
  handleTaskListsList,
  handleTemplateGet,
  handleTemplatesList,
  handleTimeEntriesList,
  handleTimeEntryCreate,
  handleTimeSummary,
  handleWikiPageGet,
} from './handlers'

const mockCycle = {
  object: 'cycle' as const,
  id: 'cyc_1',
  tenantId: 'tnt_123',
  projectId: 'prj_console',
  number: 3,
  name: 'Sprint 3',
  description: null,
  goal: 'Ship rollout',
  startsAt: 1788400000,
  endsAt: 1789000000,
  completedAt: null,
  status: 'active' as const,
  progress: {
    total: 5,
    completed: 2,
    estimatePoints: 8,
    completedEstimatePoints: 3,
  },
  throughput: {
    completedInWindow: 2,
    windowStart: 1788400000,
    windowEnd: 1789000000,
  },
  createdAt: 1788400000,
  updatedAt: 1788400000,
}

const mockTaskList = {
  object: 'task-list' as const,
  id: 'tml_1',
  tenantId: 'tnt_123',
  projectId: 'prj_console',
  milestoneId: null,
  name: 'Backlog',
  description: null,
  ownerUserId: null,
  startDate: null,
  targetDate: null,
  position: 0,
  archivedAt: null,
  progress: { total: 4, completed: 1 },
  createdAt: 1788400000,
  updatedAt: 1788400000,
}

const mockTimeEntry = {
  object: 'projects.time-entry' as const,
  id: 'tim_1',
  tenantId: 'tnt_123',
  projectId: 'prj_console',
  issueId: null,
  milestoneId: null,
  taskListId: null,
  userId: 'usr_1',
  startedAt: 1788400000,
  endedAt: 1788403600,
  durationMinutes: 60,
  billable: true,
  note: 'Deep work',
  approvalStatus: 'draft',
  timesheetId: null,
  createdBy: 'usr_1',
  createdAt: 1788400000,
  updatedAt: 1788400000,
}

const mockTimeSummary = {
  object: 'projects.time-summary' as const,
  groupBy: 'project',
  from: 1788400000,
  to: 1789000000,
  groups: [
    {
      key: 'prj_console',
      totalMinutes: 60,
      billableMinutes: 60,
      nonBillableMinutes: 0,
      entryCount: 1,
    },
  ],
  totals: {
    totalMinutes: 60,
    billableMinutes: 60,
    nonBillableMinutes: 0,
    entryCount: 1,
  },
}

const mockWorkReport = {
  object: 'projects.work-report' as const,
  period: { from: 1788400000, to: 1789000000 },
  byState: [{ key: 'todo', label: 'To do', count: 2 }],
  byType: [{ key: 'task', label: 'Task', count: 2 }],
  byAssignee: [{ key: 'usr_1', label: 'User 1', count: 1 }],
  overdue: 1,
  total: 2,
}

const mockHealthReport = {
  object: 'projects.health-report' as const,
  data: [
    {
      projectId: 'prj_console',
      name: 'Console',
      health: 'on-track' as const,
      progressPercent: 50,
      overdue: 1,
      openItems: 3,
      budgetConsumedPercent: null,
    },
  ],
}

const mockTimeReport = {
  object: 'projects.time-report' as const,
  groupBy: 'project' as const,
  period: { from: 1788400000, to: 1789000000 },
  data: [
    {
      key: 'prj_console',
      label: 'Console',
      billableMinutes: 60,
      nonBillableMinutes: 0,
    },
  ],
}

const mockBudgetReport = {
  object: 'projects.budget-variance-report' as const,
  period: { from: 1788400000, to: 1789000000 },
  data: [
    {
      projectId: 'prj_console',
      name: 'Console',
      currency: null,
      budgetMinor: null,
      actualCostMinor: null,
      varianceMinor: null,
      budgetMinutes: null,
      actualMinutes: 60,
    },
  ],
}

const mockWorkloadReport = {
  object: 'projects.workload-report' as const,
  period: { from: 1788400000, to: 1789000000 },
  data: [
    {
      userId: 'usr_1',
      label: 'User 1',
      assignedOpenItems: 2,
      plannedMinutes: 120,
      loggedMinutes: 60,
      capacityMinutes: 480,
      utilisationPercent: 12.5,
    },
  ],
}

const mockTemplate = {
  object: 'projects.project-template' as const,
  id: 'tpl_1',
  key: 'WEBAPP',
  name: 'Web app',
  description: null,
  currentVersion: 2,
  sourceProjectId: null,
  counts: { phases: 1, taskLists: 2, workItems: 3, dependencies: 0 },
  createdAt: 1788400000,
  updatedAt: 1788400000,
}

const mockModule = {
  object: 'projects.custom-module' as const,
  id: 'mcm_1',
  scope: 'org' as const,
  projectId: null,
  key: 'risks',
  singularName: 'Risk',
  pluralName: 'Risks',
  icon: null,
  version: 1,
  restrictedToRoleKeys: [],
  createdAt: 1788400000,
  updatedAt: 1788400000,
}

const mockRecord = {
  object: 'projects.custom-record' as const,
  id: 'mcr_1',
  moduleId: 'mcm_1',
  moduleKey: 'risks',
  projectId: null,
  title: 'Launch risk',
  statusKey: 'open',
  fields: {},
  createdBy: null,
  updatedBy: null,
  createdAt: 1788400000,
  updatedAt: 1788400000,
}

const mockFeed = {
  object: 'projects.activity-feed' as const,
  items: [
    {
      object: 'projects.activity-item' as const,
      id: 'act_1',
      kind: 'issue',
      subjectType: 'work-item',
      subjectId: 'iss_123',
      actorUserId: 'usr_1',
      type: 'status-changed',
      fromValue: 'todo',
      toValue: 'in-progress',
      createdAt: 1788400000,
    },
  ],
  nextCursor: null,
  hasMore: false,
}

const mockWikiPage = {
  object: 'projects.wiki-page' as const,
  id: 'wpg_1',
  tenantId: 'tnt_123',
  projectId: 'prj_console',
  slug: 'home',
  title: 'Home',
  body: '# Welcome',
  parentPageId: null,
  revisionCount: 2,
  createdAt: 1788400000,
  updatedAt: 1788400000,
}

const readOnlyConfig: Config = { ...config, scopes: ['projects:read'] }

describe('rollout read handlers', () => {
  const { client } = createClient()

  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('phases_list uses the project filter when provided', async () => {
    const spy = vi.spyOn(client.milestones, 'list').mockResolvedValue({
      data: {
        object: 'list',
        data: [mockMilestone],
        has_more: false,
        total_count: 1,
        url: '/m',
      },
      error: null,
    })
    const result = await handlePhasesList(client, config, {
      projectId: 'prj_console',
      status: 'open',
    })
    expect(spy).toHaveBeenCalledWith('org_test_123', 'prj_console', {
      status: 'open',
    })
    expect(result.isError).toBeUndefined()
    expect(textOf(result)).toContain('Version 1')
  })

  it('phases_list falls back to organization listing without a project', async () => {
    const spy = vi.spyOn(client.milestones, 'listAll').mockResolvedValue({
      data: {
        object: 'list',
        data: [mockMilestone],
        has_more: false,
        total_count: 1,
        url: '/m',
      },
      error: null,
    })
    const result = await handlePhasesList(client, config, {})
    expect(spy).toHaveBeenCalledWith('org_test_123', {})
    expect(textOf(result)).toContain('1 phase')
  })

  it('phases_list rejects an unknown status', async () => {
    const spy = vi.spyOn(client.milestones, 'listAll')
    const result = await handlePhasesList(client, config, { status: 'bogus' })
    expect(spy).not.toHaveBeenCalled()
    expect(result.isError).toBe(true)
  })

  it('phase_get retrieves one phase and surfaces API errors', async () => {
    const spy = vi
      .spyOn(client.milestones, 'retrieve')
      .mockResolvedValue({ data: mockMilestone, error: null })
    const result = await handlePhaseGet(client, config, { phase: 'ms_v1' })
    expect(spy).toHaveBeenCalledWith('org_test_123', 'ms_v1')
    expect(textOf(result)).toContain('Version 1')

    vi.spyOn(client.milestones, 'retrieve').mockResolvedValueOnce({
      data: null,
      error: { code: 'projects/milestone-not-found', message: 'Missing.' },
    })
    const missing = await handlePhaseGet(client, config, {
      phase: 'ms_missing',
    })
    expect(missing.isError).toBe(true)
    expect(textOf(missing)).toContain('projects/milestone-not-found')
  })

  it('cycles_list forwards project and status filters', async () => {
    const spy = vi.spyOn(client.cycles, 'list').mockResolvedValue({
      data: {
        object: 'list',
        data: [mockCycle],
        has_more: false,
        total_count: 1,
        url: '/c',
      },
      error: null,
    })
    const result = await handleCyclesList(client, config, {
      projectId: 'prj_console',
      status: 'active',
    })
    expect(spy).toHaveBeenCalledWith('org_test_123', {
      projectId: 'prj_console',
      status: 'active',
    })
    expect(textOf(result)).toContain('Sprint 3')
  })

  it('cycle_get retrieves one cycle', async () => {
    const spy = vi
      .spyOn(client.cycles, 'retrieve')
      .mockResolvedValue({ data: mockCycle, error: null })
    const result = await handleCycleGet(client, config, { cycle: 'cyc_1' })
    expect(spy).toHaveBeenCalledWith('org_test_123', 'cyc_1')
    expect(textOf(result)).toContain('Sprint 3')
  })

  it('task_lists_list requires a project and forwards archive flags', async () => {
    const spy = vi.spyOn(client.taskLists, 'list').mockResolvedValue({
      data: {
        object: 'list',
        data: [mockTaskList],
        has_more: false,
        total_count: 1,
        url: '/t',
      },
      error: null,
    })
    const result = await handleTaskListsList(client, config, {
      projectId: 'prj_console',
    })
    expect(spy).toHaveBeenCalledWith('org_test_123', 'prj_console', {})
    expect(textOf(result)).toContain('Backlog')

    const rejected = await handleTaskListsList(client, config, {})
    expect(rejected.isError).toBe(true)
    expect(textOf(rejected)).toContain('validation/invalid-arguments')
  })

  it('time_entries_list forwards filters and converts ISO windows', async () => {
    const spy = vi.spyOn(client.timeEntries, 'list').mockResolvedValue({
      data: {
        object: 'list',
        data: [mockTimeEntry],
        has_more: false,
        total_count: 1,
        url: '/te',
      },
      error: null,
    })
    const result = await handleTimeEntriesList(client, config, {
      projectId: 'prj_console',
      from: '2026-09-01T00:00:00.000Z',
      to: 1789000000,
      billable: true,
    })
    expect(spy).toHaveBeenCalledWith('org_test_123', {
      projectId: 'prj_console',
      from: Math.floor(Date.parse('2026-09-01T00:00:00.000Z') / 1000),
      to: 1789000000,
      billable: true,
    })
    expect(textOf(result)).toContain('tim_1')
  })

  it('time_summary requires groupBy and window', async () => {
    const spy = vi
      .spyOn(client.timeEntries, 'summary')
      .mockResolvedValue({ data: mockTimeSummary, error: null })
    const result = await handleTimeSummary(client, config, {
      groupBy: 'project',
      from: 1788400000,
      to: 1789000000,
    })
    expect(spy).toHaveBeenCalledWith('org_test_123', {
      groupBy: 'project',
      from: 1788400000,
      to: 1789000000,
    })
    expect(textOf(result)).toContain('Time summary by project')

    const rejected = await handleTimeSummary(client, config, {
      groupBy: 'project',
    })
    expect(spy).toHaveBeenCalledTimes(1)
    expect(rejected.isError).toBe(true)
  })

  it('report_work forwards the window and project', async () => {
    const spy = vi
      .spyOn(client.reports, 'work')
      .mockResolvedValue({ data: mockWorkReport, error: null })
    const result = await handleReportWork(client, config, {
      from: 1788400000,
      to: 1789000000,
      projectId: 'prj_console',
    })
    expect(spy).toHaveBeenCalledWith('org_test_123', {
      from: 1788400000,
      to: 1789000000,
      projectId: 'prj_console',
    })
    expect(textOf(result)).toContain('Work report')
  })

  it('report_health lists project health rows', async () => {
    const spy = vi
      .spyOn(client.reports, 'health')
      .mockResolvedValue({ data: mockHealthReport, error: null })
    const result = await handleReportHealth(client, config, {})
    expect(spy).toHaveBeenCalledWith('org_test_123')
    expect(textOf(result)).toContain('Console')
  })

  it('report_time forwards groupBy and window', async () => {
    const spy = vi
      .spyOn(client.reports, 'time')
      .mockResolvedValue({ data: mockTimeReport, error: null })
    const result = await handleReportTime(client, config, {
      groupBy: 'project',
      from: 1788400000,
      to: 1789000000,
    })
    expect(spy).toHaveBeenCalledWith('org_test_123', {
      groupBy: 'project',
      from: 1788400000,
      to: 1789000000,
    })
    expect(textOf(result)).toContain('Time report by project')
  })

  it('report_budget_variance forwards the window', async () => {
    const spy = vi
      .spyOn(client.reports, 'budgetVariance')
      .mockResolvedValue({ data: mockBudgetReport, error: null })
    const result = await handleReportBudgetVariance(client, config, {
      from: 1788400000,
      to: 1789000000,
    })
    expect(spy).toHaveBeenCalledWith('org_test_123', {
      from: 1788400000,
      to: 1789000000,
    })
    expect(textOf(result)).toContain('Console')
  })

  it('report_workload forwards the window and project', async () => {
    const spy = vi
      .spyOn(client.reports, 'workload')
      .mockResolvedValue({ data: mockWorkloadReport, error: null })
    const result = await handleReportWorkload(client, config, {
      from: 1788400000,
      to: 1789000000,
    })
    expect(spy).toHaveBeenCalledWith('org_test_123', {
      from: 1788400000,
      to: 1789000000,
    })
    expect(textOf(result)).toContain('usr_1')
  })

  it('templates_list and template_get read project templates', async () => {
    const listSpy = vi
      .spyOn(client.projectTemplates, 'list')
      .mockResolvedValue({
        data: {
          object: 'list',
          data: [mockTemplate],
          has_more: false,
          total_count: 1,
          url: '/tpl',
        },
        error: null,
      })
    const listed = await handleTemplatesList(client, config, {})
    expect(listSpy).toHaveBeenCalledWith('org_test_123')
    expect(textOf(listed)).toContain('Web app')

    const getSpy = vi
      .spyOn(client.projectTemplates, 'retrieve')
      .mockResolvedValue({ data: mockTemplate, error: null })
    const single = await handleTemplateGet(client, config, {
      template: 'tpl_1',
    })
    expect(getSpy).toHaveBeenCalledWith('org_test_123', 'tpl_1')
    expect(textOf(single)).toContain('WEBAPP')
  })

  it('custom modules list and records list/get forward module scope', async () => {
    const modulesSpy = vi
      .spyOn(client.customModules, 'listModules')
      .mockResolvedValue({
        data: {
          object: 'list',
          data: [mockModule],
          has_more: false,
          total_count: 1,
          url: '/m',
        },
        error: null,
      })
    const modules = await handleCustomModulesList(client, config, {})
    expect(modulesSpy).toHaveBeenCalledWith('org_test_123')
    expect(textOf(modules)).toContain('Risks')

    const recordsSpy = vi
      .spyOn(client.customModules, 'listRecords')
      .mockResolvedValue({
        data: {
          object: 'list',
          data: [mockRecord],
          has_more: false,
          total_count: 1,
          url: '/r',
        },
        error: null,
      })
    const records = await handleCustomRecordsList(client, config, {
      module: 'mcm_1',
      status: 'open',
    })
    expect(recordsSpy).toHaveBeenCalledWith('org_test_123', 'mcm_1', {
      status: 'open',
    })
    expect(textOf(records)).toContain('Launch risk')

    const recordSpy = vi
      .spyOn(client.customModules, 'retrieveRecord')
      .mockResolvedValue({ data: mockRecord, error: null })
    const single = await handleCustomRecordGet(client, config, {
      module: 'mcm_1',
      record: 'mcr_1',
    })
    expect(recordSpy).toHaveBeenCalledWith('org_test_123', 'mcm_1', 'mcr_1')
    expect(textOf(single)).toContain('Launch risk')
  })

  it('activity_list requires a project and returns feed text', async () => {
    const spy = vi
      .spyOn(client.activity, 'listProjectActivity')
      .mockResolvedValue({ data: mockFeed, error: null })
    const result = await handleActivityList(client, config, {
      projectId: 'prj_console',
      limit: 10,
    })
    expect(spy).toHaveBeenCalledWith('org_test_123', 'prj_console', {
      limit: 10,
    })
    expect(textOf(result)).toContain('status-changed')

    const rejected = await handleActivityList(client, config, {})
    expect(rejected.isError).toBe(true)
  })

  it('wiki_page_get retrieves one page and keeps markdown verbatim', async () => {
    const spy = vi
      .spyOn(client.wiki, 'retrieve')
      .mockResolvedValue({ data: mockWikiPage, error: null })
    const result = await handleWikiPageGet(client, config, {
      projectId: 'prj_console',
      page: 'home',
    })
    expect(spy).toHaveBeenCalledWith('org_test_123', 'prj_console', 'home')
    expect(textOf(result)).toContain('# Welcome')
  })

  it('time_entry_create falls back to the default user and forwards the entry', async () => {
    const spy = vi
      .spyOn(client.timeEntries, 'create')
      .mockResolvedValue({ data: mockTimeEntry, error: null })
    const withUser: Config = { ...config, defaultUserId: 'usr_1' }
    const result = await handleTimeEntryCreate(client, withUser, {
      projectId: 'prj_console',
      startedAt: 1788400000,
      endedAt: 1788403600,
      note: 'Deep work',
    })
    expect(spy).toHaveBeenCalledWith('org_test_123', {
      userId: 'usr_1',
      projectId: 'prj_console',
      startedAt: 1788400000,
      endedAt: 1788403600,
      note: 'Deep work',
      createdBy: 'usr_1',
    })
    expect(textOf(result)).toContain('tim_1')
  })

  it('time_entry_create requires a user when no default is configured', async () => {
    const spy = vi.spyOn(client.timeEntries, 'create')
    const result = await handleTimeEntryCreate(client, config, {
      projectId: 'prj_console',
      startedAt: 1788400000,
      endedAt: 1788403600,
    })
    expect(spy).not.toHaveBeenCalled()
    expect(result.isError).toBe(true)
    expect(textOf(result)).toContain('projects/time-entry-user-required')
  })

  it('write tools deny calls without the projects:write scope', async () => {
    const createSpy = vi.spyOn(client.timeEntries, 'create')
    const denied = await handleTimeEntryCreate(client, readOnlyConfig, {
      projectId: 'prj_console',
      userId: 'usr_1',
      startedAt: 1788400000,
      endedAt: 1788403600,
    })
    expect(createSpy).not.toHaveBeenCalled()
    expect(denied.isError).toBe(true)
    expect(textOf(denied)).toContain('auth/insufficient-scope')
    expect(textOf(denied)).toContain('projects:write')
  })

  it('issue create/update/comment deny calls without the write scope', async () => {
    const createSpy = vi.spyOn(client.issues, 'create')
    const updateSpy = vi.spyOn(client.issues, 'update')
    const commentSpy = vi.spyOn(client.comments, 'create')

    const created = await handleIssueCreate(client, readOnlyConfig, {
      title: 'Nope',
    })
    const updated = await handleIssueUpdate(client, readOnlyConfig, {
      issue: 'iss_123',
      title: 'Nope',
    })
    const commented = await handleIssueComment(
      client,
      { ...readOnlyConfig, defaultUserId: 'usr_1' },
      { issue: 'CONSOLE-12', body: 'Nope' }
    )

    expect(createSpy).not.toHaveBeenCalled()
    expect(updateSpy).not.toHaveBeenCalled()
    expect(commentSpy).not.toHaveBeenCalled()
    expect(created.isError).toBe(true)
    expect(updated.isError).toBe(true)
    expect(commented.isError).toBe(true)
    expect(textOf(created)).toContain('projects:write')
  })

  it('project and label writes deny calls without the write scope', async () => {
    const projectCreateSpy = vi.spyOn(client.projects, 'create')
    const projectUpdateSpy = vi.spyOn(client.projects, 'update')
    const labelCreateSpy = vi.spyOn(client.labels, 'create')

    const created = await handleProjectCreate(client, readOnlyConfig, {
      name: 'Nope',
    })
    const updated = await handleProjectUpdate(client, readOnlyConfig, {
      project: 'prj_console',
      name: 'Nope',
    })
    const labeled = await handleLabelCreate(client, readOnlyConfig, {
      name: 'Nope',
    })

    expect(projectCreateSpy).not.toHaveBeenCalled()
    expect(projectUpdateSpy).not.toHaveBeenCalled()
    expect(labelCreateSpy).not.toHaveBeenCalled()
    expect(created.isError).toBe(true)
    expect(updated.isError).toBe(true)
    expect(labeled.isError).toBe(true)
  })

  it('propagates API errors from rollout reads with the API code', async () => {
    vi.spyOn(client.cycles, 'list').mockResolvedValueOnce({
      data: null,
      error: { code: 'projects/tenant-not-found', message: 'Missing.' },
    })
    vi.spyOn(client.timeEntries, 'list').mockResolvedValueOnce({
      data: null,
      error: { code: 'projects/tenant-not-found', message: 'Missing.' },
    })
    vi.spyOn(client.reports, 'health').mockResolvedValueOnce({
      data: null,
      error: { code: 'projects/tenant-not-found', message: 'Missing.' },
    })

    const cycles = await handleCyclesList(client, config, {})
    const entries = await handleTimeEntriesList(client, config, {})
    const health = await handleReportHealth(client, config, {})

    expect(cycles.isError).toBe(true)
    expect(textOf(cycles)).toContain('projects/tenant-not-found')
    expect(entries.isError).toBe(true)
    expect(textOf(entries)).toContain('projects/tenant-not-found')
    expect(health.isError).toBe(true)
    expect(textOf(health)).toContain('projects/tenant-not-found')
  })
})
