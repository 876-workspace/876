import type {
  Budget,
  FinancialSummary,
  ProjectBilling,
  Rate,
} from '@876/projects'
import type {
  Baseline,
  BaselineComparison,
  CalendarEntry,
  Comment,
  Cycle,
  Gantt,
  Issue,
  IssueDependency,
  IssueEvent,
  IssueRelation,
  Label,
  MilestoneCustomField,
  MilestoneCustomFieldValue,
  MilestoneDetail,
  MilestoneEvent,
  MilestoneSummary,
  Project,
  ProjectEvent,
  ProjectTemplate,
  ProjectTemplateVersion,
  TaskList,
  TemplatePreview,
  TimeEntry,
  Timesheet,
  TimesheetDetail,
  WorkflowState,
  WorkItemType,
} from '@876/projects/contracts'

export function listOf<T>(items: readonly T[]) {
  return {
    object: 'list',
    data: [...items],
    hasMore: false,
    totalCount: items.length,
  } as const
}

export const sampleType: WorkItemType = {
  object: 'projects.work-item-type',
  id: 'wit_task_1',
  tenantId: 'tenant_1',
  key: 'task',
  name: 'Task',
  iconKey: 'circle-check',
  color: '#3b82f6',
  hierarchyLevel: 1,
  description: null,
  isDefault: true,
  position: 0,
  archivedAt: null,
  createdAt: 1700000000,
  updatedAt: 1700000000,
}

export const sampleState: WorkflowState = {
  object: 'projects.workflow-state',
  id: 'ws_prog',
  tenantId: 'tenant_1',
  key: 'in-progress',
  name: 'In Progress',
  category: 'active',
  color: '#3b82f6',
  description: null,
  isDefault: false,
  position: 2,
  archivedAt: null,
  createdAt: 1700000000,
  updatedAt: 1700000000,
}

export function makeProject(overrides: Partial<Project> = {}): Project {
  return {
    object: 'projects.project',
    id: 'proj_test',
    tenantId: 'tenant_1',
    name: 'Falcon Heavy',
    key: 'FAL',
    slug: 'falcon-heavy',
    description: 'Heavy lift launch vehicle',
    leadUserId: 'user_lead',
    status: 'active',
    health: 'on-track',
    startDate: 1700000000,
    targetDate: 1720000000,
    nextIssueNumber: 1,
    customerId: null,
    defaultWorkItemTypeId: null,
    position: 1,
    archivedAt: null,
    createdAt: 1700000000,
    updatedAt: 1700000000,
    memberCount: 8,
    ...overrides,
  }
}

export function makeIssue(overrides: Partial<Issue> = {}): Issue {
  return {
    object: 'projects.issue',
    id: 'issue_1',
    tenantId: 'tenant_1',
    projectId: 'proj_test',
    projectKey: 'FAL',
    number: 1,
    identifier: 'FAL-1',
    title: 'Merlin engine checkout',
    description: 'Static fire readiness review.',
    status: 'in-progress',
    typeKey: 'task',
    type: sampleType,
    state: sampleState,
    milestone: null,
    taskListId: null,
    cycleId: null,
    customFields: [],
    priority: 'high',
    assigneeUserId: 'user_eng',
    creatorUserId: 'user_lead',
    parentIssueId: null,
    estimate: 5,
    dueDate: 1725000000,
    plannedStartDate: 1724000000,
    plannedFinishDate: 1725000000,
    plannedDurationMinutes: 480,
    blocked: false,
    relationCount: 0,
    dependencyCount: 0,
    position: 1,
    labels: [],
    commentCount: 0,
    subIssueCount: 0,
    startedAt: 1700000000,
    completedAt: null,
    canceledAt: null,
    createdAt: 1700000000,
    updatedAt: 1700000000,
    ...overrides,
  }
}

export function makeLabel(overrides: Partial<Label> = {}): Label {
  return {
    object: 'projects.label',
    id: 'lbl_1',
    tenantId: 'tenant_1',
    name: 'propulsion',
    color: '#ef4444',
    description: 'Propulsion systems',
    createdAt: 1700000000,
    updatedAt: 1700000000,
    ...overrides,
  }
}

export function makeComment(overrides: Partial<Comment> = {}): Comment {
  return {
    object: 'projects.comment',
    id: 'comm_1',
    tenantId: 'tenant_1',
    issueId: 'issue_1',
    authorUserId: 'user_eng',
    body: 'Static fire complete, nominal.',
    createdAt: 1700000000,
    updatedAt: 1700000000,
    ...overrides,
  }
}

export function makeIssueEvent(overrides: Partial<IssueEvent> = {}): IssueEvent {
  return {
    object: 'projects.issue-event',
    id: 'evt_1',
    issueId: 'issue_1',
    actorUserId: 'user_eng',
    type: 'status-changed',
    fromValue: 'todo',
    toValue: 'in-progress',
    createdAt: 1700000000,
    ...overrides,
  }
}

export function makePhase(overrides: Partial<MilestoneDetail> = {}): MilestoneDetail {
  return {
    object: 'projects.milestone',
    id: 'ms_test',
    tenantId: 'tenant_1',
    projectId: 'proj_test',
    key: 'M1',
    name: 'Integration',
    description: 'Stage integration phase',
    status: 'open',
    startDate: 1700000000,
    targetDate: 1720000000,
    completedAt: null,
    position: 1,
    createdAt: 1700000000,
    updatedAt: 1700000000,
    ownerUserId: 'user_lead',
    ...overrides,
  }
}

export function makePhaseSummary(
  overrides: Partial<MilestoneSummary> = {}
): MilestoneSummary {
  return {
    object: 'projects.milestone-summary',
    milestoneId: 'ms_test',
    issueCount: 4,
    completedIssueCount: 1,
    progressPercent: 25,
    ...overrides,
  }
}

export function makePhaseEvent(
  overrides: Partial<MilestoneEvent> = {}
): MilestoneEvent {
  return {
    object: 'projects.milestone-event',
    id: 'msevt_1',
    milestoneId: 'ms_test',
    actorUserId: 'user_lead',
    type: 'phase-created',
    fromValue: null,
    toValue: null,
    createdAt: 1700000000,
    ...overrides,
  }
}

export function makePhaseField(
  overrides: Partial<MilestoneCustomField> = {}
): MilestoneCustomField {
  return {
    object: 'projects.milestone-custom-field',
    id: 'mcf_1',
    tenantId: 'tenant_1',
    key: 'launch-site',
    label: 'Launch site',
    fieldType: 'text',
    options: null,
    required: false,
    description: null,
    position: 0,
    archivedAt: null,
    createdAt: 1700000000,
    updatedAt: 1700000000,
    ...overrides,
  }
}

export function makePhaseFieldValue(
  overrides: Partial<MilestoneCustomFieldValue> = {}
): MilestoneCustomFieldValue {
  return {
    object: 'projects.milestone-custom-field-value',
    id: 'mcfv_1',
    milestoneId: 'ms_test',
    fieldId: 'mcf_1',
    fieldKey: 'launch-site',
    fieldType: 'text',
    value: 'LC-39A',
    updatedBy: null,
    createdAt: 1700000000,
    updatedAt: 1700000000,
    ...overrides,
  }
}

export function makeCycle(overrides: Partial<Cycle> = {}): Cycle {
  return {
    object: 'cycle',
    id: 'cyc_test',
    tenantId: 'tenant_1',
    projectId: 'proj_test',
    number: 7,
    name: 'Sprint 7',
    description: 'Propulsion sprint',
    goal: 'Finish static fire',
    startsAt: 1720000000,
    endsAt: 1720604800,
    completedAt: null,
    status: 'active',
    progress: {
      total: 4,
      completed: 1,
      estimatePoints: 8,
      completedEstimatePoints: 2,
    },
    throughput: {
      completedInWindow: 1,
      windowStart: 1720000000,
      windowEnd: 1720604800,
    },
    createdAt: 1720000000,
    updatedAt: 1720000000,
    ...overrides,
  }
}

export function makeTaskList(overrides: Partial<TaskList> = {}): TaskList {
  return {
    object: 'task-list',
    id: 'tl_test',
    tenantId: 'tenant_1',
    projectId: 'proj_test',
    milestoneId: 'ms_test',
    name: 'Launch checklist',
    description: 'Pre-flight checks',
    ownerUserId: 'user_lead',
    startDate: 1700000000,
    targetDate: 1720000000,
    position: 0,
    archivedAt: null,
    progress: { total: 5, completed: 2 },
    createdAt: 1700000000,
    updatedAt: 1700000000,
    ...overrides,
  }
}

export function makeCalendarEntry(
  overrides: Partial<CalendarEntry> = {}
): CalendarEntry {
  return {
    object: 'calendar-entry',
    kind: 'meeting',
    id: 'evt_cal_1',
    occurrenceStart: 1720000000,
    occurrenceEnd: 1720003600,
    allDay: false,
    title: 'Readiness review',
    projectId: 'proj_test',
    issueIdentifier: 'FAL-1',
    ...overrides,
  }
}

export function makeEvent(overrides: Partial<ProjectEvent> = {}): ProjectEvent {
  return {
    object: 'projects.event',
    id: 'evt_test',
    tenantId: 'tenant_1',
    projectId: 'proj_test',
    milestoneId: null,
    issueId: null,
    kind: 'meeting',
    title: 'Readiness review',
    description: 'Go/no-go poll',
    startsAt: 1720000000,
    endsAt: 1720003600,
    allDay: false,
    location: 'Hangar 1',
    meetingUrl: null,
    createdBy: 'user_lead',
    recurrence: null,
    attendees: [],
    ...overrides,
  }
}

export function makeTimeEntry(
  overrides: Partial<TimeEntry> = {}
): TimeEntry {
  return {
    object: 'projects.time-entry',
    id: 'te_test',
    tenantId: 'tenant_1',
    projectId: 'proj_test',
    issueId: 'issue_1',
    milestoneId: null,
    taskListId: null,
    userId: 'user_eng',
    startedAt: 1720000000,
    endedAt: 1720003600,
    durationMinutes: 60,
    billable: true,
    note: 'Static fire monitoring',
    approvalStatus: 'approved',
    timesheetId: null,
    createdBy: 'user_eng',
    createdAt: 1720000000,
    updatedAt: 1720000000,
    ...overrides,
  }
}

export function makeTimesheet(
  overrides: Partial<Timesheet> = {}
): Timesheet {
  return {
    object: 'projects.timesheet',
    id: 'ts_test',
    tenantId: 'tenant_1',
    userId: 'user_eng',
    periodStart: 1720000000,
    periodEnd: 1720604800,
    status: 'submitted',
    submittedAt: 1720604800,
    decidedAt: null,
    decidedBy: null,
    note: null,
    createdAt: 1720604800,
    updatedAt: 1720604800,
    ...overrides,
  }
}

export function makeTimesheetDetail(
  overrides: Partial<TimesheetDetail> = {}
): TimesheetDetail {
  return {
    ...makeTimesheet(),
    entries: [makeTimeEntry()],
    totals: {
      totalMinutes: 60,
      billableMinutes: 60,
      nonBillableMinutes: 0,
      entryCount: 1,
    },
    ...overrides,
  }
}

export function makeGantt(overrides: Partial<Gantt> = {}): Gantt {
  return {
    object: 'gantt',
    rows: [
      {
        object: 'gantt-row',
        id: 'row_1',
        kind: 'work-item',
        parentRowId: null,
        issueId: 'issue_1',
        name: 'Merlin engine checkout',
        plannedStart: 1724000000,
        plannedFinish: 1725000000,
        actualStart: 1724000000,
        actualFinish: null,
        percentComplete: 50,
        isCritical: false,
      },
    ],
    edges: [],
    criticalIssueIds: [],
    range: { start: 1724000000, end: 1725000000 },
    ...overrides,
  }
}

export function makeBaseline(overrides: Partial<Baseline> = {}): Baseline {
  return {
    object: 'projects.baseline',
    id: 'bl_test',
    tenantId: 'tenant_1',
    projectId: 'proj_test',
    name: 'Pre-flight baseline',
    capturedBy: 'user_lead',
    capturedAt: 1720000000,
    note: null,
    itemCount: 3,
    ...overrides,
  }
}

export function makeBaselineComparison(
  overrides: Partial<BaselineComparison> = {}
): BaselineComparison {
  return {
    object: 'baseline-comparison',
    baselineId: 'bl_test',
    projectId: 'proj_test',
    items: [
      {
        object: 'baseline-comparison-item',
        issueId: 'issue_1',
        identifier: 'FAL-1',
        baselineStart: 1724000000,
        baselineFinish: 1725000000,
        currentStart: 1724086400,
        currentFinish: 1725000000,
        startVarianceMinutes: 1440,
        finishVarianceMinutes: 0,
      },
    ],
    ...overrides,
  }
}

export function makeBilling(
  overrides: Partial<ProjectBilling> = {}
): ProjectBilling {
  return {
    object: 'projects.project-billing',
    id: 'pb_test',
    tenantId: 'tenant_1',
    projectId: 'proj_test',
    billingMethod: 'time-and-materials',
    currency: 'USD',
    billingCustomerId: null,
    fixedFeeAmount: null,
    createdAt: 1700000000,
    updatedAt: 1700000000,
    ...overrides,
  }
}

export function makeBudget(overrides: Partial<Budget> = {}): Budget {
  return {
    object: 'projects.budget',
    id: 'bud_test',
    tenantId: 'tenant_1',
    projectId: 'proj_test',
    scope: 'project',
    milestoneId: null,
    userId: null,
    amountMinor: 500000,
    hours: null,
    thresholdPercent: 80,
    periodStart: null,
    periodEnd: null,
    createdAt: 1700000000,
    updatedAt: 1700000000,
    ...overrides,
  }
}

export function makeRate(overrides: Partial<Rate> = {}): Rate {
  return {
    object: 'projects.rate',
    id: 'rate_test',
    tenantId: 'tenant_1',
    projectId: 'proj_test',
    userId: null,
    scope: 'project',
    billRateMinor: 15000,
    costRateMinor: 9000,
    currency: 'USD',
    effectiveFrom: null,
    effectiveTo: null,
    createdAt: 1700000000,
    updatedAt: 1700000000,
    ...overrides,
  }
}

export function makeFinancialSummary(
  overrides: Partial<FinancialSummary> = {}
): FinancialSummary {
  return {
    object: 'projects.financial-summary',
    tenantId: 'tenant_1',
    projectId: 'proj_test',
    from: 1710000000,
    to: 1720000000,
    minutes: {
      plannedMinutes: 600,
      actualMinutes: 660,
      varianceMinutes: 60,
    },
    cost: {
      plannedMinor: 90000,
      actualMinor: 99000,
      varianceMinor: 9000,
    },
    revenue: {
      plannedMinor: 150000,
      actualMinor: 165000,
      varianceMinor: 15000,
    },
    unpricedMinutes: 0,
    budgets: [],
    ...overrides,
  }
}

export function makeRelation(
  overrides: Partial<IssueRelation> = {}
): IssueRelation {
  return {
    object: 'issue-relation',
    id: 'rel_1',
    tenantId: 'tenant_1',
    sourceIssueId: 'issue_1',
    targetIssueId: 'issue_2',
    type: 'relates-to',
    createdBy: 'user_eng',
    createdAt: 1700000000,
    ...overrides,
  }
}

export function makeDependency(
  overrides: Partial<IssueDependency> = {}
): IssueDependency {
  return {
    object: 'issue-dependency',
    id: 'dep_1',
    tenantId: 'tenant_1',
    predecessorIssueId: 'issue_0',
    successorIssueId: 'issue_1',
    type: 'finish-to-start',
    lagMinutes: 0,
    createdBy: 'user_lead',
    createdAt: 1700000000,
    ...overrides,
  }
}

export function makeProjectTemplate(
  overrides: Partial<ProjectTemplate> = {}
): ProjectTemplate {
  return {
    object: 'projects.project-template',
    id: 'ptpl_test',
    key: 'web-launch',
    name: 'Web Launch',
    description: 'Standard launch plan',
    currentVersion: 3,
    sourceProjectId: null,
    counts: { phases: 2, taskLists: 1, workItems: 4, dependencies: 1 },
    createdAt: 1720000000,
    updatedAt: 1720604800,
    ...overrides,
  }
}

export function makeProjectTemplateVersion(
  overrides: Partial<ProjectTemplateVersion> = {}
): ProjectTemplateVersion {
  return {
    object: 'projects.project-template-version',
    id: 'ptplv_test',
    templateId: 'ptpl_test',
    version: 3,
    createdAt: 1720604800,
    ...overrides,
  }
}

export function makeTemplatePreview(
  overrides: Partial<TemplatePreview> = {}
): TemplatePreview {
  return {
    object: 'projects.template-preview',
    startDate: 1720000000,
    phases: [{ ref: 'phase-discover', name: 'Discover', start: 1720000000, end: 1720604800 }],
    workItems: [{ ref: 'item-kickoff', title: 'Kickoff', start: 1720000000, due: 1720086400 }],
    missing: { workItemTypes: [], workflowStates: [], labels: [] },
    ...overrides,
  }
}
