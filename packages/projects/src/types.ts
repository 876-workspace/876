import { z } from 'zod'

export interface ClientError {
  code: string
  message: string
}

export type Result<T> =
  { data: T; error: null } | { data: null; error: ClientError }

export interface ClientOptions {
  baseUrl?: string
  internalKey?: string
  fetch?: typeof fetch
  requestId?: string
}

export interface RequestOptions {
  signal?: AbortSignal
}

export const ISSUE_STATUSES = [
  'backlog',
  'todo',
  'in-progress',
  'in-review',
  'done',
  'canceled',
] as const
/**
 * Legacy software-development preset values. Workflow-state keys themselves
 * are tenant-extensible and must not be parsed with this enum at API/client
 * boundaries.
 */
export const issueStatusSchema = z.enum(ISSUE_STATUSES)
export type IssueStatus = z.infer<typeof issueStatusSchema>
export const workflowStateKeySchema = z.string().trim().min(1)
export type WorkflowStateKey = z.infer<typeof workflowStateKeySchema>

export const ISSUE_PRIORITIES = [
  'none',
  'low',
  'medium',
  'high',
  'urgent',
] as const
export const issuePrioritySchema = z.enum(ISSUE_PRIORITIES)
export type IssuePriority = z.infer<typeof issuePrioritySchema>

export const ISSUE_ORDERS = [
  'manual',
  'updated',
  'created',
  'priority',
] as const
export const issueOrderSchema = z.enum(ISSUE_ORDERS)
export type IssueOrder = z.infer<typeof issueOrderSchema>

export const PROJECT_STATUSES = [
  'planned',
  'active',
  'paused',
  'completed',
  'canceled',
] as const
export const projectStatusSchema = z.enum(PROJECT_STATUSES)
export type ProjectStatus = z.infer<typeof projectStatusSchema>

export const PROJECT_HEALTHS = ['on-track', 'at-risk', 'off-track'] as const
export const projectHealthSchema = z.enum(PROJECT_HEALTHS)
export type ProjectHealth = z.infer<typeof projectHealthSchema>

export const PROJECT_MEMBER_ROLES = ['lead', 'member', 'viewer'] as const
export const projectMemberRoleSchema = z.enum(PROJECT_MEMBER_ROLES)
export type ProjectMemberRole = z.infer<typeof projectMemberRoleSchema>

export const tenantSchema = z.object({
  object: z.literal('projects.tenant'),
  id: z.string(),
  organizationId: z.string(),
  triageProjectId: z.string().nullable(),
  createdAt: z.number(),
  updatedAt: z.number(),
})
export type Tenant = z.infer<typeof tenantSchema>

export const labelSchema = z.object({
  object: z.literal('projects.label'),
  id: z.string(),
  tenantId: z.string(),
  name: z.string(),
  color: z.string(),
  description: z.string().nullable(),
  createdAt: z.number(),
  updatedAt: z.number(),
})
export type Label = z.infer<typeof labelSchema>

export const projectMemberSchema = z.object({
  object: z.literal('projects.project-member'),
  id: z.string(),
  projectId: z.string(),
  userId: z.string(),
  role: projectMemberRoleSchema,
  createdAt: z.number(),
})
export type ProjectMember = z.infer<typeof projectMemberSchema>

export const workItemTypeSchema = z.object({
  object: z.literal('projects.work-item-type'),
  id: z.string(),
  tenantId: z.string(),
  key: z.string(),
  name: z.string(),
  iconKey: z.string(),
  color: z.string(),
  hierarchyLevel: z.number(),
  description: z.string().nullable(),
  isDefault: z.boolean(),
  position: z.number(),
  archivedAt: z.number().nullable(),
  createdAt: z.number(),
  updatedAt: z.number(),
})
export type WorkItemType = z.infer<typeof workItemTypeSchema>

export const workflowStateSchema = z.object({
  object: z.literal('projects.workflow-state'),
  id: z.string(),
  tenantId: z.string(),
  key: z.string(),
  name: z.string(),
  category: z.string(),
  color: z.string(),
  description: z.string().nullable(),
  isDefault: z.boolean(),
  position: z.number(),
  archivedAt: z.number().nullable(),
  createdAt: z.number(),
  updatedAt: z.number(),
})
export type WorkflowState = z.infer<typeof workflowStateSchema>

export const milestoneSchema = z.object({
  object: z.literal('projects.milestone'),
  id: z.string(),
  tenantId: z.string(),
  projectId: z.string(),
  key: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  status: z.string(),
  startDate: z.number().nullable(),
  targetDate: z.number().nullable(),
  completedAt: z.number().nullable(),
  position: z.number(),
  createdAt: z.number(),
  updatedAt: z.number(),
})
export type Milestone = z.infer<typeof milestoneSchema>

export const taskListProgressSchema = z.object({
  total: z.number(),
  completed: z.number(),
})
export type TaskListProgress = z.infer<typeof taskListProgressSchema>

export const taskListSchema = z.object({
  object: z.literal('task-list'),
  id: z.string(),
  tenantId: z.string(),
  projectId: z.string(),
  milestoneId: z.string().nullable(),
  name: z.string(),
  description: z.string().nullable(),
  ownerUserId: z.string().nullable(),
  startDate: z.number().nullable(),
  targetDate: z.number().nullable(),
  position: z.number(),
  archivedAt: z.number().nullable(),
  progress: taskListProgressSchema,
  createdAt: z.number(),
  updatedAt: z.number(),
})
export type TaskList = z.infer<typeof taskListSchema>

export const cycleProgressSchema = z.object({
  total: z.number(),
  completed: z.number(),
  estimatePoints: z.number(),
  completedEstimatePoints: z.number(),
})
export type CycleProgress = z.infer<typeof cycleProgressSchema>

export const cycleThroughputSchema = z.object({
  completedInWindow: z.number(),
  windowStart: z.number(),
  windowEnd: z.number(),
})
export type CycleThroughput = z.infer<typeof cycleThroughputSchema>

export const cycleSchema = z.object({
  object: z.literal('cycle'),
  id: z.string(),
  tenantId: z.string(),
  projectId: z.string().nullable(),
  number: z.number(),
  name: z.string(),
  description: z.string().nullable(),
  goal: z.string().nullable(),
  startsAt: z.number(),
  endsAt: z.number(),
  completedAt: z.number().nullable(),
  status: z.enum(['upcoming', 'active', 'completed']),
  progress: cycleProgressSchema,
  throughput: cycleThroughputSchema,
  createdAt: z.number(),
  updatedAt: z.number(),
})
export type Cycle = z.infer<typeof cycleSchema>

export const workBreakdownIssueSchema = z.object({
  id: z.string(),
  identifier: z.string(),
  title: z.string(),
  status: z.string(),
  taskListId: z.string().nullable(),
  milestoneId: z.string().nullable(),
  parentIssueId: z.string().nullable(),
  subIssueCount: z.number(),
})
export type WorkBreakdownIssue = z.infer<typeof workBreakdownIssueSchema>

export const workBreakdownTaskListSchema = z.object({
  taskList: taskListSchema,
  issues: z.array(workBreakdownIssueSchema),
})
export type WorkBreakdownTaskList = z.infer<typeof workBreakdownTaskListSchema>

export const workBreakdownPhaseSchema = z.object({
  milestone: milestoneSchema,
  taskLists: z.array(workBreakdownTaskListSchema),
  unlistedIssues: z.array(workBreakdownIssueSchema),
})
export type WorkBreakdownPhase = z.infer<typeof workBreakdownPhaseSchema>

export const workBreakdownSchema = z.object({
  object: z.literal('work-breakdown'),
  projectId: z.string(),
  phases: z.array(workBreakdownPhaseSchema),
  unphasedTaskLists: z.array(workBreakdownTaskListSchema),
  unlistedIssues: z.array(workBreakdownIssueSchema),
})
export type WorkBreakdown = z.infer<typeof workBreakdownSchema>

export const customFieldSchema = z.object({
  object: z.literal('projects.custom-field'),
  id: z.string(),
  tenantId: z.string(),
  key: z.string(),
  label: z.string(),
  fieldType: z.string(),
  options: z.unknown(),
  required: z.boolean(),
  description: z.string().nullable(),
  position: z.number(),
  typeIds: z.array(z.string()),
  archivedAt: z.number().nullable(),
  createdAt: z.number(),
  updatedAt: z.number(),
})
export type CustomField = z.infer<typeof customFieldSchema>

export const customFieldValueSchema = z.object({
  object: z.literal('projects.custom-field-value'),
  id: z.string(),
  tenantId: z.string(),
  issueId: z.string(),
  fieldId: z.string(),
  fieldKey: z.string(),
  fieldType: z.string(),
  value: z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.array(z.string()),
    z.null(),
  ]),
  updatedBy: z.string().nullable(),
  createdAt: z.number(),
  updatedAt: z.number(),
})
export type CustomFieldValue = z.infer<typeof customFieldValueSchema>

export const projectCustomFieldSchema = z.object({
  object: z.literal('projects.project-custom-field'),
  id: z.string(),
  tenantId: z.string(),
  key: z.string(),
  label: z.string(),
  fieldType: z.string(),
  options: z.unknown(),
  required: z.boolean(),
  description: z.string().nullable(),
  position: z.number(),
  archivedAt: z.number().nullable(),
  createdAt: z.number(),
  updatedAt: z.number(),
})
export type ProjectCustomField = z.infer<typeof projectCustomFieldSchema>

export const projectCustomFieldValueSchema = z.object({
  object: z.literal('projects.project-custom-field-value'),
  id: z.string(),
  tenantId: z.string(),
  projectId: z.string(),
  fieldId: z.string(),
  fieldKey: z.string(),
  fieldType: z.string(),
  value: z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.array(z.string()),
    z.null(),
  ]),
  updatedBy: z.string().nullable(),
  createdAt: z.number(),
  updatedAt: z.number(),
})
export type ProjectCustomFieldValue = z.infer<
  typeof projectCustomFieldValueSchema
>

const baseLayoutEntitySchema = z.enum(['project', 'phase', 'work-item'])
const customModuleLayoutEntitySchema = z
  .string()
  .regex(/^custom-module:[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/)
export type LayoutEntity =
  | 'project'
  | 'phase'
  | 'work-item'
  | `custom-module:${string}`
export const layoutEntitySchema = z.union([
  baseLayoutEntitySchema,
  customModuleLayoutEntitySchema,
]) as z.ZodType<LayoutEntity>

export function isCustomModuleLayoutEntity(entity: string): boolean {
  return entity.startsWith('custom-module:')
}

export function customModuleKeyFromLayoutEntity(entity: string): string | null {
  if (!isCustomModuleLayoutEntity(entity)) return null
  const key = entity.slice('custom-module:'.length)
  return key.length > 0 ? key : null
}

export const layoutFieldSchema = z.object({
  fieldKey: z.string(),
  width: z.union([z.literal(1), z.literal(2)]),
  visible: z.boolean(),
})
export type LayoutField = z.infer<typeof layoutFieldSchema>

export const layoutSectionSchema = z.object({
  key: z.string(),
  title: z.string(),
  columns: z.union([z.literal(1), z.literal(2)]),
  fields: z.array(layoutFieldSchema),
})
export type LayoutSection = z.infer<typeof layoutSectionSchema>

export const layoutConditionSchema = z.object({
  fieldKey: z.string(),
  op: z.enum(['equals', 'not-equals', 'in', 'is-empty', 'is-not-empty']),
  value: z.union([z.string(), z.array(z.string())]).optional(),
})
export type LayoutCondition = z.infer<typeof layoutConditionSchema>

export const layoutEffectSchema = z.object({
  fieldKey: z.string(),
  effect: z.enum(['show', 'hide', 'require', 'disable']),
})
export type LayoutEffect = z.infer<typeof layoutEffectSchema>

export const layoutRuleSchema = z.object({
  key: z.string(),
  when: z.array(layoutConditionSchema),
  then: z.array(layoutEffectSchema),
})
export type LayoutRule = z.infer<typeof layoutRuleSchema>

export const layoutSchema = z.object({
  object: z.literal('projects.layout'),
  id: z.string().nullable(),
  entity: layoutEntitySchema,
  workItemTypeId: z.string().nullable(),
  name: z.string(),
  version: z.number(),
  isDefault: z.boolean(),
  builtIn: z.boolean(),
  sections: z.array(layoutSectionSchema),
  rules: z.array(layoutRuleSchema),
})
export type Layout = z.infer<typeof layoutSchema>

export const projectSchema = z.object({
  object: z.literal('projects.project'),
  id: z.string(),
  tenantId: z.string(),
  name: z.string(),
  key: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  leadUserId: z.string().nullable(),
  status: projectStatusSchema,
  health: projectHealthSchema,
  startDate: z.number().nullable(),
  targetDate: z.number().nullable(),
  nextIssueNumber: z.number(),
  customerId: z.string().nullable(),
  defaultWorkItemTypeId: z.string().nullable(),
  position: z.number(),
  archivedAt: z.number().nullable(),
  createdAt: z.number(),
  updatedAt: z.number(),
  memberCount: z.number(),
  customFields: z.array(projectCustomFieldValueSchema),
})
export type Project = z.infer<typeof projectSchema>

export const issueSchema = z.object({
  object: z.literal('projects.issue'),
  id: z.string(),
  tenantId: z.string(),
  projectId: z.string(),
  projectKey: z.string(),
  number: z.number(),
  identifier: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  status: workflowStateKeySchema,
  typeKey: z.string(),
  type: workItemTypeSchema.nullable(),
  state: workflowStateSchema.nullable(),
  milestone: milestoneSchema.nullable(),
  taskListId: z.string().nullable(),
  cycleId: z.string().nullable(),
  customFields: z.array(customFieldValueSchema),
  priority: issuePrioritySchema,
  assigneeUserId: z.string().nullable(),
  creatorUserId: z.string().nullable(),
  parentIssueId: z.string().nullable(),
  estimate: z.number().nullable(),
  dueDate: z.number().nullable(),
  plannedStartDate: z.number().nullable(),
  plannedFinishDate: z.number().nullable(),
  plannedDurationMinutes: z.number().nullable(),
  blocked: z.boolean(),
  relationCount: z.number(),
  dependencyCount: z.number(),
  position: z.number(),
  labels: z.array(labelSchema),
  commentCount: z.number(),
  subIssueCount: z.number(),
  startedAt: z.number().nullable(),
  completedAt: z.number().nullable(),
  canceledAt: z.number().nullable(),
  createdAt: z.number(),
  updatedAt: z.number(),
})
export type Issue = z.infer<typeof issueSchema>

export const issueEventSchema = z.object({
  object: z.literal('projects.issue-event'),
  id: z.string(),
  issueId: z.string(),
  actorUserId: z.string().nullable(),
  type: z.string(),
  fromValue: z.string().nullable(),
  toValue: z.string().nullable(),
  createdAt: z.number(),
})
export type IssueEvent = z.infer<typeof issueEventSchema>

export const ISSUE_RELATION_TYPES = [
  'relates-to',
  'duplicates',
  'blocks',
] as const
export const issueRelationTypeSchema = z.enum(ISSUE_RELATION_TYPES)
export type IssueRelationType = z.infer<typeof issueRelationTypeSchema>

export const ISSUE_DEPENDENCY_TYPES = [
  'finish-to-start',
  'start-to-start',
  'finish-to-finish',
  'start-to-finish',
] as const
export const issueDependencyTypeSchema = z.enum(ISSUE_DEPENDENCY_TYPES)
export type IssueDependencyType = z.infer<typeof issueDependencyTypeSchema>

export const issueRelationSchema = z.object({
  object: z.literal('issue-relation'),
  id: z.string(),
  tenantId: z.string(),
  sourceIssueId: z.string(),
  targetIssueId: z.string(),
  type: issueRelationTypeSchema,
  createdBy: z.string().nullable(),
  createdAt: z.number(),
})
export type IssueRelation = z.infer<typeof issueRelationSchema>

export const issueDependencySchema = z.object({
  object: z.literal('issue-dependency'),
  id: z.string(),
  tenantId: z.string(),
  predecessorIssueId: z.string(),
  successorIssueId: z.string(),
  type: issueDependencyTypeSchema,
  lagMinutes: z.number(),
  createdBy: z.string().nullable(),
  createdAt: z.number(),
})
export type IssueDependency = z.infer<typeof issueDependencySchema>

export const issueDependencyViewSchema = z.object({
  predecessors: z.array(issueDependencySchema),
  successors: z.array(issueDependencySchema),
})
export type IssueDependencyView = z.infer<typeof issueDependencyViewSchema>

export const scheduleConstraintSchema = z.object({
  issueId: z.string(),
  identifier: z.string(),
  type: issueDependencyTypeSchema,
  lagMinutes: z.number(),
})
export type ScheduleConstraint = z.infer<typeof scheduleConstraintSchema>

export const scheduleSuggestionSchema = z.object({
  earliestStart: z.number().nullable(),
  earliestFinish: z.number().nullable(),
  constrainedBy: z.array(scheduleConstraintSchema),
})
export type ScheduleSuggestion = z.infer<typeof scheduleSuggestionSchema>

export const GANTT_ZOOMS = ['day', 'week', 'month'] as const
export const ganttZoomSchema = z.enum(GANTT_ZOOMS)
export type GanttZoom = z.infer<typeof ganttZoomSchema>

export const GANTT_ROW_KINDS = [
  'phase',
  'task-list',
  'work-item',
  'sub-item',
] as const
export const ganttRowKindSchema = z.enum(GANTT_ROW_KINDS)
export type GanttRowKind = z.infer<typeof ganttRowKindSchema>

export const ganttRowSchema = z.object({
  object: z.literal('gantt-row'),
  id: z.string(),
  kind: ganttRowKindSchema,
  parentRowId: z.string().nullable(),
  issueId: z.string().nullable(),
  name: z.string(),
  plannedStart: z.number().nullable(),
  plannedFinish: z.number().nullable(),
  actualStart: z.number().nullable(),
  actualFinish: z.number().nullable(),
  percentComplete: z.number(),
  isCritical: z.boolean(),
})
export type GanttRow = z.infer<typeof ganttRowSchema>

export const ganttEdgeSchema = z.object({
  object: z.literal('gantt-edge'),
  id: z.string(),
  predecessorIssueId: z.string(),
  successorIssueId: z.string(),
  type: issueDependencyTypeSchema,
  lagMinutes: z.number(),
})
export type GanttEdge = z.infer<typeof ganttEdgeSchema>

export const ganttSchema = z.object({
  object: z.literal('gantt'),
  rows: z.array(ganttRowSchema),
  edges: z.array(ganttEdgeSchema),
  criticalIssueIds: z.array(z.string()),
  range: z.object({
    start: z.number().nullable(),
    end: z.number().nullable(),
  }),
})
export type Gantt = z.infer<typeof ganttSchema>

export const baselineSchema = z.object({
  object: z.literal('projects.baseline'),
  id: z.string(),
  tenantId: z.string(),
  projectId: z.string(),
  name: z.string(),
  capturedBy: z.string().nullable(),
  capturedAt: z.number(),
  note: z.string().nullable(),
  itemCount: z.number(),
})
export type Baseline = z.infer<typeof baselineSchema>

export const baselineItemSchema = z.object({
  object: z.literal('projects.baseline-item'),
  id: z.string(),
  baselineId: z.string(),
  issueId: z.string(),
  plannedStartDate: z.number().nullable(),
  plannedFinishDate: z.number().nullable(),
  plannedDurationMinutes: z.number().nullable(),
  status: z.string(),
})
export type BaselineItem = z.infer<typeof baselineItemSchema>

export const baselineDetailSchema = baselineSchema.extend({
  items: z.array(baselineItemSchema),
})
export type BaselineDetail = z.infer<typeof baselineDetailSchema>

export const baselineComparisonItemSchema = z.object({
  object: z.literal('baseline-comparison-item'),
  issueId: z.string(),
  identifier: z.string(),
  baselineStart: z.number().nullable(),
  baselineFinish: z.number().nullable(),
  currentStart: z.number().nullable(),
  currentFinish: z.number().nullable(),
  startVarianceMinutes: z.number().nullable(),
  finishVarianceMinutes: z.number().nullable(),
})
export type BaselineComparisonItem = z.infer<
  typeof baselineComparisonItemSchema
>

export const baselineComparisonSchema = z.object({
  object: z.literal('baseline-comparison'),
  baselineId: z.string(),
  projectId: z.string(),
  items: z.array(baselineComparisonItemSchema),
})
export type BaselineComparison = z.infer<typeof baselineComparisonSchema>

export const commentSchema = z.object({
  object: z.literal('projects.comment'),
  id: z.string(),
  tenantId: z.string(),
  issueId: z.string(),
  authorUserId: z.string().nullable(),
  body: z.string(),
  createdAt: z.number(),
  updatedAt: z.number(),
})
export type Comment = z.infer<typeof commentSchema>

export const presetSchema = z.object({
  key: z.enum(['software-development', 'business-operations', 'general']),
  name: z.string(),
  workItemTypes: z.array(
    z.object({
      key: z.string(),
      name: z.string(),
      iconKey: z.string(),
      color: z.string(),
      hierarchyLevel: z.number(),
      isDefault: z.boolean(),
      position: z.number(),
    })
  ),
  workflowStates: z.array(
    z.object({
      key: z.string(),
      name: z.string(),
      category: z.string(),
      color: z.string(),
      isDefault: z.boolean(),
      position: z.number(),
    })
  ),
  customFields: z.array(
    z.object({
      key: z.string(),
      label: z.string(),
      fieldType: z.string(),
      position: z.number(),
    })
  ),
})
export type Preset = z.infer<typeof presetSchema>

export const deletedSchema = z.object({
  object: z.string(),
  id: z.string(),
  deleted: z.literal(true),
})
export type Deleted = z.infer<typeof deletedSchema>

export function createListSchema<T extends z.ZodTypeAny>(itemSchema: T) {
  return z.object({
    object: z.literal('list'),
    data: z.array(itemSchema),
    has_more: z.boolean(),
    total_count: z.number().nullable(),
    url: z.string(),
  })
}

export const listEnvelopeSchema = z.object({
  object: z.literal('list'),
  data: z.array(z.unknown()),
  has_more: z.boolean(),
  total_count: z.number().nullable(),
  url: z.string(),
})

export const tenantListSchema = createListSchema(tenantSchema)
export type TenantList = z.infer<typeof tenantListSchema>

export const projectListSchema = createListSchema(projectSchema)
export type ProjectList = z.infer<typeof projectListSchema>

export const projectMemberListSchema = createListSchema(projectMemberSchema)
export type ProjectMemberList = z.infer<typeof projectMemberListSchema>

export const issueListSchema = createListSchema(issueSchema)
export type IssueList = z.infer<typeof issueListSchema>

export const issueEventListSchema = createListSchema(issueEventSchema)
export type IssueEventList = z.infer<typeof issueEventListSchema>

export const issueRelationListSchema = createListSchema(issueRelationSchema)
export type IssueRelationList = z.infer<typeof issueRelationListSchema>

export const commentListSchema = createListSchema(commentSchema)
export type CommentList = z.infer<typeof commentListSchema>

export const labelListSchema = createListSchema(labelSchema)
export type LabelList = z.infer<typeof labelListSchema>

export const workItemTypeListSchema = createListSchema(workItemTypeSchema)
export type WorkItemTypeList = z.infer<typeof workItemTypeListSchema>

export const workflowStateListSchema = createListSchema(workflowStateSchema)
export type WorkflowStateList = z.infer<typeof workflowStateListSchema>

export const milestoneListSchema = createListSchema(milestoneSchema)
export type MilestoneList = z.infer<typeof milestoneListSchema>

export const taskListListSchema = createListSchema(taskListSchema)
export type TaskListList = z.infer<typeof taskListListSchema>

export const cycleListSchema = createListSchema(cycleSchema)
export type CycleList = z.infer<typeof cycleListSchema>

export const customFieldListSchema = createListSchema(customFieldSchema)
export type CustomFieldList = z.infer<typeof customFieldListSchema>

export const customFieldValueListSchema = createListSchema(
  customFieldValueSchema
)
export type CustomFieldValueList = z.infer<typeof customFieldValueListSchema>

export const projectCustomFieldListSchema = createListSchema(
  projectCustomFieldSchema
)
export type ProjectCustomFieldList = z.infer<
  typeof projectCustomFieldListSchema
>

export const projectCustomFieldValueListSchema = createListSchema(
  projectCustomFieldValueSchema
)
export type ProjectCustomFieldValueList = z.infer<
  typeof projectCustomFieldValueListSchema
>

export const layoutListSchema = createListSchema(layoutSchema)
export type LayoutList = z.infer<typeof layoutListSchema>

export const baselineListSchema = createListSchema(baselineSchema)
export type BaselineList = z.infer<typeof baselineListSchema>

export const workflowTransitionSchema = z.object({
  object: z.literal('projects.workflow-transition'),
  id: z.string(),
  workItemTypeId: z.string().nullable(),
  fromStateKey: z.string().nullable(),
  toStateKey: z.string(),
  name: z.string(),
  requiredPermission: z.string().nullable(),
  requiredFieldKeys: z.array(z.string()),
  requiresComment: z.boolean(),
  createdAt: z.number(),
  updatedAt: z.number(),
})
export type WorkflowTransition = z.infer<typeof workflowTransitionSchema>

export const workflowBlueprintSchema = z.object({
  object: z.literal('projects.workflow-blueprint'),
  workItemTypeId: z.string(),
  updatedAt: z.number().nullable(),
  transitions: z.array(workflowTransitionSchema),
})
export type WorkflowBlueprint = z.infer<typeof workflowBlueprintSchema>

export const automationTriggerSchema = z.enum([
  'work-item.created',
  'work-item.updated',
  'work-item.state-changed',
  'phase.completed',
  'due-date.approaching',
  'time-entry.submitted',
  'budget.threshold-reached',
  'custom-record.created',
  'custom-record.updated',
  'custom-record.status-changed',
])
export type AutomationTrigger = z.infer<typeof automationTriggerSchema>

export const automationActionSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('set-field'),
    fieldKey: z.string(),
    value: z.union([
      z.string(),
      z.array(z.string()),
      z.number(),
      z.boolean(),
      z.null(),
    ]),
  }),
  z.object({ type: z.literal('assign'), userId: z.string() }),
  z.object({ type: z.literal('add-label'), label: z.string() }),
  z.object({ type: z.literal('remove-label'), label: z.string() }),
  z.object({
    type: z.literal('create-reminder'),
    title: z.string().optional(),
    remindAt: z.number().optional(),
    offsetMinutesBeforeDue: z.number().optional(),
  }),
  z.object({
    type: z.literal('create-event'),
    title: z.string(),
    description: z.string().nullable().optional(),
    startsAt: z.number(),
    endsAt: z.number().nullable().optional(),
  }),
  z.object({
    type: z.literal('notify'),
    userId: z.string(),
    kind: z.string().optional(),
    title: z.string(),
  }),
  z.object({ type: z.literal('call-webhook'), url: z.string() }),
  z.object({
    type: z.literal('create-sub-item'),
    title: z.string(),
    typeKey: z.string().optional(),
    assigneeUserId: z.string().nullable().optional(),
  }),
])
export type AutomationAction = z.infer<typeof automationActionSchema>

export const automationRuleSchema = z.object({
  object: z.literal('projects.automation-rule'),
  id: z.string(),
  projectId: z.string().nullable(),
  name: z.string(),
  enabled: z.boolean(),
  trigger: automationTriggerSchema,
  conditions: z.array(layoutConditionSchema),
  actions: z.array(automationActionSchema),
  hasWebhookSecret: z.boolean(),
  createdAt: z.number(),
  updatedAt: z.number(),
})
export type AutomationRule = z.infer<typeof automationRuleSchema>

export const automationRuleListSchema = createListSchema(automationRuleSchema)
export type AutomationRuleList = z.infer<typeof automationRuleListSchema>

export const automationRunSchema = z.object({
  object: z.literal('projects.automation-run'),
  id: z.string(),
  ruleId: z.string(),
  eventId: z.string(),
  status: z.enum(['succeeded', 'failed', 'skipped']),
  errorCode: z.string().nullable(),
  attempt: z.number(),
  responseCode: z.number().nullable(),
  startedAt: z.number(),
  finishedAt: z.number(),
  durationMs: z.number(),
})
export type AutomationRun = z.infer<typeof automationRunSchema>

export const automationRunListSchema = createListSchema(automationRunSchema)
export type AutomationRunList = z.infer<typeof automationRunListSchema>

export const automationTestSchema = z.object({
  object: z.literal('projects.automation-test'),
  ruleId: z.string(),
  subjectType: z.string(),
  subjectId: z.string(),
  matched: z.boolean(),
  conditions: z.array(
    z.object({ fieldKey: z.string(), op: z.string(), matched: z.boolean() })
  ),
  plannedActions: z.array(z.object({ type: z.string() })),
})
export type AutomationTest = z.infer<typeof automationTestSchema>

export const notificationSchema = z.object({
  object: z.literal('projects.notification'),
  id: z.string(),
  userId: z.string(),
  kind: z.string(),
  title: z.string(),
  subjectType: z.string().nullable(),
  subjectId: z.string().nullable(),
  readAt: z.number().nullable(),
  createdAt: z.number(),
})
export type Notification = z.infer<typeof notificationSchema>

export const notificationListSchema = createListSchema(notificationSchema)
export type NotificationList = z.infer<typeof notificationListSchema>

export const presetListSchema = z.array(presetSchema)
export type PresetList = z.infer<typeof presetListSchema>

export interface EnsureTenantInput {
  organizationId: string
}

export interface ListProjectsQuery {
  status?: ProjectStatus
  lead?: string
  q?: string
  includeArchived?: boolean
  limit?: number
  startingAfter?: string
  endingBefore?: string
}

export interface CreateProjectInput {
  name: string
  key?: string
  description?: string | null
  leadUserId?: string | null
  status?: ProjectStatus
  health?: ProjectHealth
  startDate?: number | null
  targetDate?: number | null
  customerId?: string | null
  defaultWorkItemTypeId?: string | null
  position?: number
}

export interface UpdateProjectInput {
  name?: string
  key?: string
  description?: string | null
  leadUserId?: string | null
  status?: ProjectStatus
  health?: ProjectHealth
  startDate?: number | null
  targetDate?: number | null
  customerId?: string | null
  defaultWorkItemTypeId?: string | null
  position?: number
}

export interface AddProjectMemberInput {
  userId: string
  role?: ProjectMemberRole
}

export interface ListIssuesQuery {
  project?: string
  status?: WorkflowStateKey | WorkflowStateKey[]
  priority?: IssuePriority | IssuePriority[] | string | string[]
  assignee?: string
  label?: string | string[]
  parent?: string
  q?: string
  updatedSince?: number
  includeDeleted?: boolean
  order?: IssueOrder
  limit?: number
  startingAfter?: string
  endingBefore?: string
}

export interface CreateIssueInput {
  projectId?: string
  title: string
  description?: string | null
  status?: WorkflowStateKey
  typeKey?: string
  milestoneId?: string | null
  taskListId?: string | null
  cycleId?: string | null
  priority?: IssuePriority
  assigneeUserId?: string | null
  creatorUserId?: string | null
  parentIssueId?: string | null
  estimate?: number | null
  dueDate?: number | null
  plannedStartDate?: number | null
  plannedFinishDate?: number | null
  plannedDurationMinutes?: number | null
  labelIds?: string[]
  customFields?: SetCustomFieldValueInput[]
  position?: number
}

export interface UpdateIssueInput {
  projectId?: string
  title?: string
  description?: string | null
  status?: WorkflowStateKey
  typeKey?: string
  milestoneId?: string | null
  taskListId?: string | null
  cycleId?: string | null
  priority?: IssuePriority
  assigneeUserId?: string | null
  creatorUserId?: string | null
  parentIssueId?: string | null
  estimate?: number | null
  dueDate?: number | null
  plannedStartDate?: number | null
  plannedFinishDate?: number | null
  plannedDurationMinutes?: number | null
  labelIds?: string[]
  customFields?: SetCustomFieldValueInput[]
  position?: number
  actorUserId?: string | null
}

export interface CreateIssueRelationInput {
  targetIssueId: string
  type: IssueRelationType
  actorUserId?: string | null
}

export interface CreateIssueDependencyInput {
  predecessorIssueId: string
  successorIssueId: string
  type?: IssueDependencyType
  lagMinutes?: number
  actorUserId?: string | null
}

export interface UpdateIssueDependencyInput {
  type?: IssueDependencyType
  lagMinutes?: number
}

export interface CreateLabelInput {
  name: string
  color?: string
  description?: string | null
}

export interface UpdateLabelInput {
  name?: string
  color?: string
  description?: string | null
}

export interface ListCommentsQuery {
  limit?: number
  startingAfter?: string
  endingBefore?: string
}

export interface CreateCommentInput {
  body: string
  authorUserId?: string
}

export interface UpdateCommentInput {
  body: string
}

export interface CreateWorkItemTypeInput {
  key: string
  name: string
  iconKey: string
  color: string
  hierarchyLevel?: number
  description?: string | null
  isDefault?: boolean
  position?: number
}

export interface UpdateWorkItemTypeInput {
  name?: string
  iconKey?: string
  color?: string
  hierarchyLevel?: number
  description?: string | null
  isDefault?: boolean
  position?: number
}

export interface CreateWorkflowStateInput {
  key: string
  name: string
  category: 'backlog' | 'unstarted' | 'started' | 'completed' | 'canceled'
  color: string
  description?: string | null
  isDefault?: boolean
  position?: number
}

export interface UpdateWorkflowStateInput {
  name?: string
  category?: 'backlog' | 'unstarted' | 'started' | 'completed' | 'canceled'
  color?: string
  description?: string | null
  isDefault?: boolean
  position?: number
}

export interface CreateMilestoneInput {
  projectId: string
  key: string
  name: string
  description?: string | null
  status?: 'open' | 'completed' | 'canceled'
  startDate?: number | null
  targetDate?: number | null
  position?: number
}

export interface UpdateMilestoneInput {
  name?: string
  description?: string | null
  status?: 'open' | 'completed' | 'canceled'
  startDate?: number | null
  targetDate?: number | null
  position?: number
}

export interface MilestoneListParams {
  projectId: string
  status?: 'open' | 'completed' | 'canceled'
}

export interface TaskListListParams {
  includeArchived?: boolean
}

export interface CreateTaskListInput {
  name: string
  description?: string | null
  milestoneId?: string | null
  ownerUserId?: string | null
  startDate?: number | null
  targetDate?: number | null
  position?: number
  actorUserId?: string | null
}

export interface UpdateTaskListInput {
  name?: string
  description?: string | null
  milestoneId?: string | null
  ownerUserId?: string | null
  startDate?: number | null
  targetDate?: number | null
  position?: number
  actorUserId?: string | null
}

export interface ReorderTaskListsInput {
  orderedIds: string[]
  actorUserId?: string | null
}

export interface MoveTaskListIssuesInput {
  issueIds: string[]
  actorUserId?: string | null
}

export interface ListCyclesQuery {
  projectId?: string
  status?: 'upcoming' | 'active' | 'completed'
}

export interface CreateCycleInput {
  projectId?: string | null
  number?: number
  name: string
  description?: string | null
  goal?: string | null
  startsAt: number
  endsAt: number
  actorUserId?: string | null
}

export interface UpdateCycleInput {
  projectId?: string | null
  name?: string
  description?: string | null
  goal?: string | null
  startsAt?: number
  endsAt?: number
  completedAt?: number | null
  actorUserId?: string | null
}

export interface AssignCycleIssuesInput {
  issueIds: string[]
  actorUserId?: string | null
}

export interface CustomFieldOption {
  key: string
  label: string
}

export interface CreateCustomFieldInput {
  key: string
  label: string
  fieldType:
    | 'text'
    | 'textarea'
    | 'number'
    | 'decimal'
    | 'boolean'
    | 'date'
    | 'select'
    | 'multi-select'
    | 'user'
    | 'url'
  options?: CustomFieldOption[]
  required?: boolean
  description?: string | null
  position?: number
  typeIds?: string[]
}

export interface UpdateCustomFieldInput {
  label?: string
  fieldType?: CreateCustomFieldInput['fieldType']
  options?: CustomFieldOption[]
  required?: boolean
  description?: string | null
  position?: number
  typeIds?: string[]
}

export interface SetCustomFieldValueInput {
  fieldId: string
  value: string | number | boolean | string[] | null
}

export type CustomFieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'decimal'
  | 'boolean'
  | 'date'
  | 'select'
  | 'multi-select'
  | 'user'
  | 'url'

export interface CreateProjectCustomFieldInput {
  key: string
  label: string
  fieldType: CustomFieldType
  options?: CustomFieldOption[]
  required?: boolean
  description?: string | null
  position?: number
}

export interface UpdateProjectCustomFieldInput {
  label?: string
  fieldType?: CustomFieldType
  options?: CustomFieldOption[]
  required?: boolean
  description?: string | null
  position?: number
}

export interface SetProjectCustomFieldValuesInput {
  customFields: SetCustomFieldValueInput[]
  updatedBy?: string | null
}

export interface LayoutFieldInput {
  fieldKey: string
  width: 1 | 2
  visible: boolean
}

export interface LayoutSectionInput {
  key: string
  title: string
  columns: 1 | 2
  fields: LayoutFieldInput[]
}

export interface LayoutConditionInput {
  fieldKey: string
  op: 'equals' | 'not-equals' | 'in' | 'is-empty' | 'is-not-empty'
  value?: string | string[]
}

export interface LayoutEffectInput {
  fieldKey: string
  effect: 'show' | 'hide' | 'require' | 'disable'
}

export interface LayoutRuleInput {
  key: string
  when: LayoutConditionInput[]
  then: LayoutEffectInput[]
}

export interface CreateLayoutInput {
  entity: LayoutEntity
  workItemTypeId?: string | null
  name: string
  sections: LayoutSectionInput[]
  rules?: LayoutRuleInput[]
  isDefault?: boolean
}

export interface UpdateLayoutInput {
  name?: string
  sections?: LayoutSectionInput[]
  rules?: LayoutRuleInput[]
}

export interface ListLayoutsQuery {
  entity?: LayoutEntity
  workItemTypeId?: string
}

export interface ResolveLayoutQuery {
  entity: LayoutEntity
  workItemTypeId?: string
}

export interface ApplyPresetInput {
  key: 'software-development' | 'business-operations' | 'general'
}

export interface GetGanttQuery {
  zoom?: GanttZoom
  includeSubItems?: boolean
}

export interface CreateBaselineInput {
  name: string
  note?: string | null
  capturedBy?: string | null
}

export const EVENT_KINDS = ['event', 'meeting'] as const
export const eventKindSchema = z.enum(EVENT_KINDS)
export type EventKind = z.infer<typeof eventKindSchema>

export const ATTENDEE_RESPONSES = [
  'invited',
  'accepted',
  'declined',
  'tentative',
] as const
export const attendeeResponseSchema = z.enum(ATTENDEE_RESPONSES)
export type AttendeeResponse = z.infer<typeof attendeeResponseSchema>

export const RECURRENCE_FREQUENCIES = [
  'daily',
  'weekly',
  'monthly',
  'yearly',
] as const
export const recurrenceFrequencySchema = z.enum(RECURRENCE_FREQUENCIES)
export type RecurrenceFrequency = z.infer<typeof recurrenceFrequencySchema>

export const recurrenceRuleSchema = z.object({
  freq: recurrenceFrequencySchema,
  interval: z.number(),
  byWeekday: z.array(z.number()),
  until: z.number().nullable(),
  count: z.number().nullable(),
})
export type RecurrenceRule = z.infer<typeof recurrenceRuleSchema>

export const eventAttendeeSchema = z.object({
  object: z.literal('projects.event-attendee'),
  id: z.string(),
  eventId: z.string(),
  userId: z.string(),
  response: z.string(),
  createdAt: z.number(),
  updatedAt: z.number(),
})
export type EventAttendee = z.infer<typeof eventAttendeeSchema>

export const projectEventSchema = z.object({
  object: z.literal('projects.event'),
  id: z.string(),
  tenantId: z.string(),
  projectId: z.string(),
  milestoneId: z.string().nullable(),
  issueId: z.string().nullable(),
  kind: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  startsAt: z.number(),
  endsAt: z.number().nullable(),
  allDay: z.boolean(),
  location: z.string().nullable(),
  meetingUrl: z.string().nullable(),
  createdBy: z.string().nullable(),
  recurrence: recurrenceRuleSchema.nullable(),
  attendees: z.array(eventAttendeeSchema),
})
export type ProjectEvent = z.infer<typeof projectEventSchema>

export const reminderSchema = z.object({
  object: z.literal('projects.reminder'),
  id: z.string(),
  tenantId: z.string(),
  issueId: z.string().nullable(),
  milestoneId: z.string().nullable(),
  eventId: z.string().nullable(),
  remindAt: z.number().nullable(),
  offsetMinutesBeforeDue: z.number().nullable(),
  recurrence: recurrenceRuleSchema.nullable(),
  channel: z.string(),
  createdBy: z.string(),
  active: z.boolean(),
  createdAt: z.number(),
  updatedAt: z.number(),
})
export type Reminder = z.infer<typeof reminderSchema>

export const dueReminderSchema = reminderSchema.extend({
  dueAt: z.number(),
})
export type DueReminder = z.infer<typeof dueReminderSchema>

export const CALENDAR_ENTRY_KINDS = [
  'project',
  'phase',
  'work-item',
  'event',
  'meeting',
] as const
export const calendarEntryKindSchema = z.enum(CALENDAR_ENTRY_KINDS)
export type CalendarEntryKind = z.infer<typeof calendarEntryKindSchema>

export const calendarEntrySchema = z.object({
  object: z.literal('calendar-entry'),
  kind: calendarEntryKindSchema,
  id: z.string(),
  occurrenceStart: z.number(),
  occurrenceEnd: z.number().nullable(),
  allDay: z.boolean(),
  title: z.string(),
  projectId: z.string(),
  issueIdentifier: z.string().optional(),
})
export type CalendarEntry = z.infer<typeof calendarEntrySchema>

export const calendarSchema = z.object({
  object: z.literal('calendar'),
  entries: z.array(calendarEntrySchema),
})
export type Calendar = z.infer<typeof calendarSchema>

export const myWorkIssueSchema = z.object({
  object: z.literal('projects.my-work-issue'),
  id: z.string(),
  projectId: z.string(),
  identifier: z.string(),
  title: z.string(),
  status: z.string(),
  dueDate: z.number().nullable(),
  plannedStartDate: z.number().nullable(),
  plannedFinishDate: z.number().nullable(),
})
export type MyWorkIssue = z.infer<typeof myWorkIssueSchema>

export const myWorkSchema = z.object({
  object: z.literal('my-work'),
  userId: z.string(),
  assignedIssues: z.array(myWorkIssueSchema),
  upcomingEvents: z.array(projectEventSchema),
  dueReminders: z.array(dueReminderSchema),
})
export type MyWork = z.infer<typeof myWorkSchema>

export const eventListSchema = createListSchema(projectEventSchema)
export type EventList = z.infer<typeof eventListSchema>

export const reminderListSchema = createListSchema(reminderSchema)
export type ReminderList = z.infer<typeof reminderListSchema>

export const dueReminderListSchema = createListSchema(dueReminderSchema)
export type DueReminderList = z.infer<typeof dueReminderListSchema>

export interface RecurrenceInput {
  freq: RecurrenceFrequency
  interval?: number
  byWeekday?: number[]
  until?: number
  count?: number
}

export interface ListEventsQuery {
  projectId?: string
}

export interface CreateEventInput {
  projectId: string
  milestoneId?: string | null
  issueId?: string | null
  kind?: EventKind
  title: string
  description?: string | null
  startsAt: number
  endsAt?: number | null
  allDay?: boolean
  location?: string | null
  meetingUrl?: string | null
  createdBy?: string | null
  recurrence?: RecurrenceInput | null
}

export interface UpdateEventInput {
  milestoneId?: string | null
  issueId?: string | null
  kind?: EventKind
  title?: string
  description?: string | null
  startsAt?: number
  endsAt?: number | null
  allDay?: boolean
  location?: string | null
  meetingUrl?: string | null
  recurrence?: RecurrenceInput | null
}

export interface AddEventAttendeeInput {
  userId: string
  response?: AttendeeResponse
}

export interface RespondEventAttendeeInput {
  response: AttendeeResponse
}

export interface CreateReminderInput {
  issueId?: string | null
  milestoneId?: string | null
  eventId?: string | null
  remindAt?: number | null
  offsetMinutesBeforeDue?: number | null
  recurrence?: RecurrenceInput | null
  channel?: 'in-app'
  createdBy: string
  active?: boolean
}

export interface UpdateReminderInput {
  issueId?: string | null
  milestoneId?: string | null
  eventId?: string | null
  remindAt?: number | null
  offsetMinutesBeforeDue?: number | null
  recurrence?: RecurrenceInput | null
  active?: boolean
}

export interface ListDueRemindersQuery {
  at?: number
  createdBy?: string
}

export interface GetCalendarQuery {
  from: number
  to: number
  projectId?: string
  kinds?: CalendarEntryKind[]
}

export const TIME_APPROVAL_STATUSES = [
  'draft',
  'submitted',
  'approved',
  'rejected',
] as const
export const timeApprovalStatusSchema = z.enum(TIME_APPROVAL_STATUSES)
export type TimeApprovalStatus = z.infer<typeof timeApprovalStatusSchema>

export const TIMESHEET_STATUSES = [
  'draft',
  'submitted',
  'approved',
  'rejected',
] as const
export const timesheetStatusSchema = z.enum(TIMESHEET_STATUSES)
export type TimesheetStatus = z.infer<typeof timesheetStatusSchema>

export const TIME_SUMMARY_GROUPS = ['project', 'user', 'issue', 'day'] as const
export const timeSummaryGroupBySchema = z.enum(TIME_SUMMARY_GROUPS)
export type TimeSummaryGroupBy = z.infer<typeof timeSummaryGroupBySchema>

export const timeEntrySchema = z.object({
  object: z.literal('projects.time-entry'),
  id: z.string(),
  tenantId: z.string(),
  projectId: z.string(),
  issueId: z.string().nullable(),
  milestoneId: z.string().nullable(),
  taskListId: z.string().nullable(),
  userId: z.string(),
  startedAt: z.number(),
  endedAt: z.number().nullable(),
  durationMinutes: z.number().nullable(),
  billable: z.boolean(),
  note: z.string().nullable(),
  approvalStatus: z.string(),
  timesheetId: z.string().nullable(),
  createdBy: z.string().nullable(),
  createdAt: z.number(),
  updatedAt: z.number(),
})
export type TimeEntry = z.infer<typeof timeEntrySchema>

export const timerStartResultSchema = z.object({
  stopped: timeEntrySchema.nullable(),
  started: timeEntrySchema,
})
export type TimerStartResult = z.infer<typeof timerStartResultSchema>

export const timeTotalsSchema = z.object({
  totalMinutes: z.number(),
  billableMinutes: z.number(),
  nonBillableMinutes: z.number(),
  entryCount: z.number(),
})
export type TimeTotals = z.infer<typeof timeTotalsSchema>

export const timesheetSchema = z.object({
  object: z.literal('projects.timesheet'),
  id: z.string(),
  tenantId: z.string(),
  userId: z.string(),
  periodStart: z.number(),
  periodEnd: z.number(),
  status: z.string(),
  submittedAt: z.number().nullable(),
  decidedAt: z.number().nullable(),
  decidedBy: z.string().nullable(),
  note: z.string().nullable(),
  createdAt: z.number(),
  updatedAt: z.number(),
})
export type Timesheet = z.infer<typeof timesheetSchema>

export const timesheetDetailSchema = timesheetSchema.extend({
  entries: z.array(timeEntrySchema),
  totals: timeTotalsSchema,
})
export type TimesheetDetail = z.infer<typeof timesheetDetailSchema>

export const timesheetEventSchema = z.object({
  object: z.literal('projects.timesheet-event'),
  id: z.string(),
  tenantId: z.string(),
  timesheetId: z.string(),
  actorUserId: z.string(),
  from: z.string(),
  to: z.string(),
  note: z.string().nullable(),
  createdAt: z.number(),
})
export type TimesheetEvent = z.infer<typeof timesheetEventSchema>

export const timeSummaryGroupSchema = z.object({
  key: z.string().nullable(),
  totalMinutes: z.number(),
  billableMinutes: z.number(),
  nonBillableMinutes: z.number(),
  entryCount: z.number(),
})
export type TimeSummaryGroupResult = z.infer<typeof timeSummaryGroupSchema>

export const timeSummarySchema = z.object({
  object: z.literal('projects.time-summary'),
  groupBy: z.string(),
  from: z.number(),
  to: z.number(),
  groups: z.array(timeSummaryGroupSchema),
  totals: timeTotalsSchema,
})
export type TimeSummary = z.infer<typeof timeSummarySchema>

export const timeEntryListSchema = createListSchema(timeEntrySchema)
export type TimeEntryList = z.infer<typeof timeEntryListSchema>

export const timesheetListSchema = createListSchema(timesheetSchema)
export type TimesheetList = z.infer<typeof timesheetListSchema>

export const timesheetEventListSchema = createListSchema(timesheetEventSchema)
export type TimesheetEventList = z.infer<typeof timesheetEventListSchema>

export interface ListTimeEntriesQuery {
  userId?: string
  projectId?: string
  issueId?: string
  from?: number
  to?: number
  billable?: boolean
  approvalStatus?: TimeApprovalStatus
}

export interface CreateTimeEntryInput {
  userId: string
  projectId: string
  issueId?: string | null
  milestoneId?: string | null
  taskListId?: string | null
  startedAt: number
  endedAt: number
  durationMinutes?: number
  billable?: boolean
  note?: string | null
  createdBy?: string | null
}

export interface UpdateTimeEntryInput {
  projectId?: string
  issueId?: string | null
  milestoneId?: string | null
  taskListId?: string | null
  startedAt?: number
  endedAt?: number | null
  durationMinutes?: number | null
  billable?: boolean
  note?: string | null
}

export interface StartTimerInput {
  userId: string
  projectId: string
  issueId?: string | null
  milestoneId?: string | null
  taskListId?: string | null
  note?: string | null
  billable?: boolean
  startedAt?: number
}

export interface StopTimerInput {
  userId: string
  endedAt?: number
}

export interface GetTimeSummaryQuery {
  groupBy: TimeSummaryGroupBy
  from: number
  to: number
  userId?: string
  projectId?: string
  issueId?: string
}

export interface CreateTimesheetInput {
  userId: string
  periodStart: number
  periodEnd: number
  note?: string | null
  entryIds?: string[]
}

export interface ListTimesheetsQuery {
  userId?: string
  status?: TimesheetStatus
}

export interface ApproveTimesheetInput {
  decidedBy: string
  note?: string | null
}

export interface RejectTimesheetInput {
  decidedBy: string
  note: string
}

export const BILLING_METHODS = [
  'non-billable',
  'fixed-fee',
  'time-and-materials',
  'hourly',
  'phase-based',
] as const
export const billingMethodSchema = z.enum(BILLING_METHODS)
export type BillingMethod = z.infer<typeof billingMethodSchema>

export const BUDGET_SCOPES = ['project', 'milestone', 'user'] as const
export const budgetScopeSchema = z.enum(BUDGET_SCOPES)
export type BudgetScope = z.infer<typeof budgetScopeSchema>

export const RATE_SCOPES = ['project', 'user', 'project-user'] as const
export const rateScopeSchema = z.enum(RATE_SCOPES)
export type RateScope = z.infer<typeof rateScopeSchema>

export const projectBillingSchema = z.object({
  object: z.literal('projects.project-billing'),
  id: z.string(),
  tenantId: z.string(),
  projectId: z.string(),
  billingMethod: billingMethodSchema,
  currency: z.string(),
  billingCustomerId: z.string().nullable(),
  fixedFeeAmount: z.number().nullable(),
  createdAt: z.number(),
  updatedAt: z.number(),
})
export type ProjectBilling = z.infer<typeof projectBillingSchema>

export const budgetSchema = z.object({
  object: z.literal('projects.budget'),
  id: z.string(),
  tenantId: z.string(),
  projectId: z.string(),
  scope: budgetScopeSchema,
  milestoneId: z.string().nullable(),
  userId: z.string().nullable(),
  amountMinor: z.number().nullable(),
  hours: z.number().nullable(),
  thresholdPercent: z.number(),
  periodStart: z.number().nullable(),
  periodEnd: z.number().nullable(),
  createdAt: z.number(),
  updatedAt: z.number(),
})
export type Budget = z.infer<typeof budgetSchema>

export const budgetListSchema = createListSchema(budgetSchema)
export type BudgetList = z.infer<typeof budgetListSchema>

export const rateSchema = z.object({
  object: z.literal('projects.rate'),
  id: z.string(),
  tenantId: z.string(),
  projectId: z.string().nullable(),
  userId: z.string().nullable(),
  scope: rateScopeSchema,
  billRateMinor: z.number(),
  costRateMinor: z.number(),
  currency: z.string(),
  effectiveFrom: z.number().nullable(),
  effectiveTo: z.number().nullable(),
  createdAt: z.number(),
  updatedAt: z.number(),
})
export type Rate = z.infer<typeof rateSchema>

export const rateListSchema = createListSchema(rateSchema)
export type RateList = z.infer<typeof rateListSchema>

export const moneyPlannedActualSchema = z.object({
  plannedMinor: z.number().nullable(),
  actualMinor: z.number(),
  varianceMinor: z.number().nullable(),
})
export type MoneyPlannedActual = z.infer<typeof moneyPlannedActualSchema>

export const minutesPlannedActualSchema = z.object({
  plannedMinutes: z.number(),
  actualMinutes: z.number(),
  varianceMinutes: z.number(),
})
export type MinutesPlannedActual = z.infer<typeof minutesPlannedActualSchema>

export const budgetConsumptionSchema = z.object({
  budgetId: z.string(),
  scope: z.string(),
  kind: z.enum(['amount', 'hours']),
  spent: z.number(),
  budget: z.number(),
  percent: z.number(),
  overThreshold: z.boolean(),
  overBudget: z.boolean(),
  remaining: z.number(),
})
export type BudgetConsumption = z.infer<typeof budgetConsumptionSchema>

export const financialSummarySchema = z.object({
  object: z.literal('projects.financial-summary'),
  tenantId: z.string(),
  projectId: z.string(),
  from: z.number(),
  to: z.number(),
  minutes: minutesPlannedActualSchema,
  cost: moneyPlannedActualSchema,
  revenue: moneyPlannedActualSchema,
  unpricedMinutes: z.number(),
  budgets: z.array(budgetConsumptionSchema),
})
export type FinancialSummary = z.infer<typeof financialSummarySchema>

export const invoiceDraftSchema = z.object({
  object: z.literal('projects.invoice-draft'),
  invoiceId: z.string(),
  tenantId: z.string(),
  projectId: z.string(),
  from: z.number(),
  to: z.number(),
  idempotencyKey: z.string(),
  billedEntryIds: z.array(z.string()),
  billedCount: z.number(),
  billedAmountMinor: z.number(),
})
export type InvoiceDraft = z.infer<typeof invoiceDraftSchema>

export interface PutProjectBillingInput {
  billingMethod: BillingMethod
  currency?: string
  billingCustomerId?: string | null
  fixedFeeAmount?: number | null
}

export interface CreateBudgetInput {
  scope: BudgetScope
  milestoneId?: string | null
  userId?: string | null
  amountMinor?: number | null
  hours?: number | null
  thresholdPercent?: number
  periodStart?: number | null
  periodEnd?: number | null
}

export interface UpdateBudgetInput {
  amountMinor?: number | null
  hours?: number | null
  thresholdPercent?: number
  periodStart?: number | null
  periodEnd?: number | null
  milestoneId?: string | null
  userId?: string | null
}

export interface CreateRateInput {
  scope: RateScope
  userId?: string | null
  billRateMinor: number
  costRateMinor: number
  currency?: string
  effectiveFrom?: number | null
  effectiveTo?: number | null
}

export interface UpdateRateInput {
  userId?: string | null
  billRateMinor?: number
  costRateMinor?: number
  currency?: string
  effectiveFrom?: number | null
  effectiveTo?: number | null
}

export interface GetFinancialSummaryQuery {
  from: number
  to: number
}

export interface CreateInvoiceDraftInput {
  from: number
  to: number
}

export type ReportFormat = 'json' | 'csv'

export const reportPeriodSchema = z.object({
  from: z.number(),
  to: z.number(),
})
export type ReportPeriod = z.infer<typeof reportPeriodSchema>

export const countRowSchema = z.object({
  key: z.string(),
  label: z.string(),
  count: z.number(),
})
export type CountRow = z.infer<typeof countRowSchema>

export const workReportSchema = z.object({
  object: z.literal('projects.work-report'),
  period: reportPeriodSchema,
  byState: z.array(countRowSchema),
  byType: z.array(countRowSchema),
  byAssignee: z.array(countRowSchema),
  overdue: z.number(),
  total: z.number(),
})
export type WorkReport = z.infer<typeof workReportSchema>

export const PROJECT_HEALTH_STATES = [
  'on-track',
  'at-risk',
  'off-track',
  'unknown',
] as const
export const projectHealthStateSchema = z.enum(PROJECT_HEALTH_STATES)
export type ProjectHealthState = z.infer<typeof projectHealthStateSchema>

export const projectHealthRowSchema = z.object({
  projectId: z.string(),
  name: z.string(),
  health: projectHealthStateSchema,
  progressPercent: z.number().nullable(),
  overdue: z.number(),
  openItems: z.number(),
  budgetConsumedPercent: z.number().nullable(),
})
export type ProjectHealthRow = z.infer<typeof projectHealthRowSchema>

export const healthReportSchema = z.object({
  object: z.literal('projects.health-report'),
  data: z.array(projectHealthRowSchema),
})
export type HealthReport = z.infer<typeof healthReportSchema>

export const TIME_REPORT_GROUPS = ['project', 'user', 'issue'] as const
export const timeReportGroupSchema = z.enum(TIME_REPORT_GROUPS)
export type TimeReportGroup = z.infer<typeof timeReportGroupSchema>

export const timeReportRowSchema = z.object({
  key: z.string(),
  label: z.string(),
  billableMinutes: z.number(),
  nonBillableMinutes: z.number(),
})
export type TimeReportRow = z.infer<typeof timeReportRowSchema>

export const timeReportSchema = z.object({
  object: z.literal('projects.time-report'),
  groupBy: timeReportGroupSchema,
  period: reportPeriodSchema,
  data: z.array(timeReportRowSchema),
})
export type TimeReport = z.infer<typeof timeReportSchema>

export const budgetVarianceRowSchema = z.object({
  projectId: z.string(),
  name: z.string(),
  currency: z.string().nullable(),
  budgetMinor: z.string().nullable(),
  actualCostMinor: z.string().nullable(),
  varianceMinor: z.string().nullable(),
  budgetMinutes: z.number().nullable(),
  actualMinutes: z.number(),
})
export type BudgetVarianceRow = z.infer<typeof budgetVarianceRowSchema>

export const budgetVarianceReportSchema = z.object({
  object: z.literal('projects.budget-variance-report'),
  period: reportPeriodSchema,
  data: z.array(budgetVarianceRowSchema),
})
export type BudgetVarianceReport = z.infer<typeof budgetVarianceReportSchema>

export const workloadRowSchema = z.object({
  userId: z.string(),
  label: z.string(),
  assignedOpenItems: z.number(),
  plannedMinutes: z.number(),
  loggedMinutes: z.number(),
  capacityMinutes: z.number().nullable(),
  utilisationPercent: z.number().nullable(),
})
export type WorkloadRow = z.infer<typeof workloadRowSchema>

export const workloadReportSchema = z.object({
  object: z.literal('projects.workload-report'),
  period: reportPeriodSchema,
  data: z.array(workloadRowSchema),
})
export type WorkloadReport = z.infer<typeof workloadReportSchema>

export const memberCapacitySchema = z.object({
  object: z.literal('projects.member-capacity'),
  id: z.string(),
  tenantId: z.string(),
  userId: z.string(),
  minutesPerWeek: z.number(),
  effectiveFrom: z.number(),
  effectiveTo: z.number().nullable(),
  createdAt: z.number(),
  updatedAt: z.number(),
})
export type MemberCapacity = z.infer<typeof memberCapacitySchema>

export const memberCapacityListSchema = createListSchema(memberCapacitySchema)
export type MemberCapacityList = z.infer<typeof memberCapacityListSchema>

export interface GetWorkReportQuery {
  projectId?: string
  from: number
  to: number
  format?: ReportFormat
}

export interface GetHealthReportQuery {
  format?: ReportFormat
}

export interface GetTimeReportQuery {
  groupBy: TimeReportGroup
  from: number
  to: number
  projectId?: string
  format?: ReportFormat
}

export interface GetBudgetVarianceReportQuery {
  from: number
  to: number
  format?: ReportFormat
}

export interface GetWorkloadReportQuery {
  from: number
  to: number
  projectId?: string
  format?: ReportFormat
}

export interface ListCapacitiesQuery {
  userId?: string
}

export interface CreateCapacityInput {
  userId: string
  minutesPerWeek: number
  effectiveFrom: number
  effectiveTo?: number | null
}

export interface UpdateCapacityInput {
  minutesPerWeek?: number
  effectiveFrom?: number
  effectiveTo?: number | null
}

export const templateDefinitionSchema = z.object({
  schemaVersion: z.literal(1),
  project: z
    .object({
      description: z.string().nullable().optional(),
      status: projectStatusSchema.optional(),
      health: projectHealthSchema.optional(),
      billingMethod: z.string().optional(),
      currency: z.string().optional(),
      fixedFeeAmount: z.number().nullable().optional(),
    })
    .optional(),
  phases: z
    .array(
      z.object({
        ref: z.string(),
        key: z.string(),
        name: z.string(),
        description: z.string().nullable().optional(),
        startOffsetDays: z.number().optional(),
        durationDays: z.number().nullable().optional(),
        position: z.number().optional(),
      })
    )
    .optional(),
  taskLists: z
    .array(
      z.object({
        ref: z.string(),
        name: z.string(),
        description: z.string().nullable().optional(),
        phaseRef: z.string().nullable().optional(),
        startOffsetDays: z.number().optional(),
        durationDays: z.number().nullable().optional(),
        position: z.number().optional(),
      })
    )
    .optional(),
  workItems: z
    .array(
      z.object({
        ref: z.string(),
        title: z.string(),
        description: z.string().nullable().optional(),
        typeKey: z.string(),
        stateKey: z.string(),
        priority: issuePrioritySchema.optional(),
        estimate: z.number().nullable().optional(),
        labels: z.array(z.string()).optional(),
        phaseRef: z.string().nullable().optional(),
        taskListRef: z.string().nullable().optional(),
        parentRef: z.string().nullable().optional(),
        startOffsetDays: z.number().optional(),
        dueOffsetDays: z.number().optional(),
        durationDays: z.number().nullable().optional(),
      })
    )
    .optional(),
  dependencies: z
    .array(
      z.object({
        fromRef: z.string(),
        toRef: z.string(),
        type: issueDependencyTypeSchema.optional(),
        lagDays: z.number().optional(),
      })
    )
    .optional(),
  customFieldDefinitions: z
    .array(
      z.object({
        key: z.string(),
        label: z.string(),
        fieldType: z.string(),
        options: z.array(z.object({ key: z.string(), label: z.string() })).optional(),
        required: z.boolean().optional(),
        description: z.string().nullable().optional(),
        typeKeys: z.array(z.string()).optional(),
      })
    )
    .optional(),
  budgetDefaults: z
    .array(
      z.object({
        scope: z.string(),
        phaseRef: z.string().nullable().optional(),
        amountMinor: z.number().nullable().optional(),
        hours: z.number().nullable().optional(),
        thresholdPercent: z.number().optional(),
        periodStartOffsetDays: z.number().nullable().optional(),
        periodEndOffsetDays: z.number().nullable().optional(),
      })
    )
    .optional(),
})
export type TemplateDefinition = z.infer<typeof templateDefinitionSchema>

export const templateCountsSchema = z.object({
  phases: z.number(),
  taskLists: z.number(),
  workItems: z.number(),
  dependencies: z.number(),
})
export type TemplateCounts = z.infer<typeof templateCountsSchema>

export const projectTemplateSchema = z.object({
  object: z.literal('projects.project-template'),
  id: z.string(),
  key: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  currentVersion: z.number(),
  sourceProjectId: z.string().nullable(),
  counts: templateCountsSchema,
  createdAt: z.number(),
  updatedAt: z.number(),
})
export type ProjectTemplate = z.infer<typeof projectTemplateSchema>

export const projectTemplateListSchema = createListSchema(projectTemplateSchema)
export type ProjectTemplateList = z.infer<typeof projectTemplateListSchema>

export const projectTemplateVersionSchema = z.object({
  object: z.literal('projects.project-template-version'),
  id: z.string(),
  templateId: z.string(),
  version: z.number(),
  createdAt: z.number(),
})
export type ProjectTemplateVersion = z.infer<typeof projectTemplateVersionSchema>

export const projectTemplateVersionListSchema = createListSchema(
  projectTemplateVersionSchema
)
export type ProjectTemplateVersionList = z.infer<
  typeof projectTemplateVersionListSchema
>

export const templatePreviewSchema = z.object({
  object: z.literal('projects.template-preview'),
  startDate: z.number(),
  phases: z.array(
    z.object({
      ref: z.string(),
      name: z.string(),
      start: z.number().nullable(),
      end: z.number().nullable(),
    })
  ),
  workItems: z.array(
    z.object({
      ref: z.string(),
      title: z.string(),
      start: z.number().nullable(),
      due: z.number().nullable(),
    })
  ),
  missing: z.object({
    workItemTypes: z.array(z.string()),
    workflowStates: z.array(z.string()),
    labels: z.array(z.string()),
  }),
})
export type TemplatePreview = z.infer<typeof templatePreviewSchema>

export interface CreateProjectTemplateInput {
  key: string
  name: string
  description?: string | null
  definition: TemplateDefinition
  sourceProjectId?: string | null
}

export interface UpdateProjectTemplateInput {
  name?: string
  description?: string | null
  definition?: TemplateDefinition
}

export interface SaveAsTemplateInput {
  key: string
  name?: string
  description?: string | null
}

export interface TemplateIncludeFlags {
  includeWorkItems?: boolean
  includeDependencies?: boolean
  includeBudgets?: boolean
}

export interface PreviewTemplateInput extends TemplateIncludeFlags {
  startDate: number
}

export interface InstantiateTemplateInput extends TemplateIncludeFlags {
  name: string
  key?: string
  startDate: number
  idempotencyKey?: string
}

export interface CloneProjectInput {
  name: string
  key?: string
  startDate?: number | null
}

export const followerSchema = z.object({
  object: z.literal('projects.follower'),
  id: z.string(),
  tenantId: z.string(),
  subjectType: z.string(),
  subjectId: z.string(),
  userId: z.string(),
  createdAt: z.number(),
})
export type Follower = z.infer<typeof followerSchema>
export const followerListSchema = createListSchema(followerSchema)
export type FollowerList = z.infer<typeof followerListSchema>

export const activityItemSchema = z.object({
  object: z.literal('projects.activity-item'),
  id: z.string(),
  kind: z.string(),
  subjectType: z.string(),
  subjectId: z.string(),
  actorUserId: z.string().nullable(),
  type: z.string(),
  fromValue: z.string().nullable(),
  toValue: z.string().nullable(),
  createdAt: z.number(),
})
export type ActivityItem = z.infer<typeof activityItemSchema>

export const activityFeedSchema = z.object({
  object: z.literal('projects.activity-feed'),
  items: z.array(activityItemSchema),
  nextCursor: z.string().nullable(),
  hasMore: z.boolean(),
})
export type ActivityFeed = z.infer<typeof activityFeedSchema>

export const discussionSchema = z.object({
  object: z.literal('projects.discussion'),
  id: z.string(),
  tenantId: z.string(),
  projectId: z.string(),
  title: z.string(),
  body: z.string(),
  pinned: z.boolean(),
  locked: z.boolean(),
  clientVisible: z.boolean(),
  authorUserId: z.string().nullable(),
  postCount: z.number(),
  createdAt: z.number(),
  updatedAt: z.number(),
})
export type Discussion = z.infer<typeof discussionSchema>
export const discussionListSchema = createListSchema(discussionSchema)
export type DiscussionList = z.infer<typeof discussionListSchema>

export const discussionPostSchema = z.object({
  object: z.literal('projects.discussion-post'),
  id: z.string(),
  tenantId: z.string(),
  discussionId: z.string(),
  authorUserId: z.string().nullable(),
  body: z.string(),
  editCount: z.number(),
  createdAt: z.number(),
  updatedAt: z.number(),
})
export type DiscussionPost = z.infer<typeof discussionPostSchema>
export const discussionPostListSchema = createListSchema(discussionPostSchema)
export type DiscussionPostList = z.infer<typeof discussionPostListSchema>

export const wikiPageSchema = z.object({
  object: z.literal('projects.wiki-page'),
  id: z.string(),
  tenantId: z.string(),
  projectId: z.string(),
  slug: z.string(),
  title: z.string(),
  body: z.string(),
  parentPageId: z.string().nullable(),
  revisionCount: z.number(),
  createdAt: z.number(),
  updatedAt: z.number(),
})
export type WikiPage = z.infer<typeof wikiPageSchema>
export const wikiPageListSchema = createListSchema(wikiPageSchema)
export type WikiPageList = z.infer<typeof wikiPageListSchema>

export const wikiRevisionSchema = z.object({
  object: z.literal('projects.wiki-revision'),
  id: z.string(),
  pageId: z.string(),
  title: z.string(),
  body: z.string(),
  authorUserId: z.string().nullable(),
  createdAt: z.number(),
})
export type WikiRevision = z.infer<typeof wikiRevisionSchema>
export const wikiRevisionListSchema = createListSchema(wikiRevisionSchema)
export type WikiRevisionList = z.infer<typeof wikiRevisionListSchema>

export const clientGrantSchema = z.object({
  object: z.literal('projects.client-grant'),
  id: z.string(),
  tenantId: z.string(),
  projectId: z.string(),
  userId: z.string(),
  allowComments: z.boolean(),
  allowDiscussions: z.boolean(),
  allowFiles: z.boolean(),
  allowTime: z.boolean(),
  allowInvoices: z.boolean(),
  allowWiki: z.boolean(),
  invitedBy: z.string().nullable(),
  revokedAt: z.number().nullable(),
  createdAt: z.number(),
  updatedAt: z.number(),
})
export type ClientGrant = z.infer<typeof clientGrantSchema>
export const clientGrantListSchema = createListSchema(clientGrantSchema)
export type ClientGrantList = z.infer<typeof clientGrantListSchema>

export const attachmentLinkSchema = z.object({
  object: z.literal('projects.attachment-link'),
  id: z.string(),
  tenantId: z.string(),
  projectId: z.string(),
  issueId: z.string().nullable(),
  milestoneId: z.string().nullable(),
  url: z.string(),
  name: z.string().nullable(),
  clientVisible: z.boolean(),
  createdBy: z.string().nullable(),
  createdAt: z.number(),
  updatedAt: z.number(),
})
export type AttachmentLink = z.infer<typeof attachmentLinkSchema>
export const attachmentLinkListSchema = createListSchema(attachmentLinkSchema)
export type AttachmentLinkList = z.infer<typeof attachmentLinkListSchema>

export const visibilityResultSchema = z.object({
  object: z.string(),
  id: z.string(),
  clientVisible: z.boolean(),
})
export type VisibilityResult = z.infer<typeof visibilityResultSchema>

export interface FollowInput {
  subjectType: 'project' | 'phase' | 'work-item'
  subjectId: string
  userId: string
}

export interface ListFollowersQuery {
  subjectType: 'project' | 'phase' | 'work-item'
  subjectId: string
  limit?: number
  startingAfter?: string
}

export interface UnfollowInput {
  subjectType: 'project' | 'phase' | 'work-item'
  subjectId: string
  userId: string
}

export interface ListDiscussionsQuery {
  limit?: number
  startingAfter?: string
}

export interface CreateDiscussionInput {
  title: string
  body: string
  authorUserId?: string
  pinned?: boolean
}

export interface UpdateDiscussionInput {
  title?: string
  body?: string
  pinned?: boolean
  locked?: boolean
}

export interface CreateDiscussionPostInput {
  body: string
  authorUserId?: string
}

export interface UpdateDiscussionPostInput {
  body: string
  authorUserId: string
}

export interface ListWikiPagesQuery {
  limit?: number
  startingAfter?: string
  parentPageId?: string | null
}

export interface CreateWikiPageInput {
  title: string
  body: string
  slug?: string
  parentPageId?: string | null
  authorUserId?: string
}

export interface UpdateWikiPageInput {
  title?: string
  body?: string
  parentPageId?: string | null
  authorUserId?: string
}

export interface RestoreWikiRevisionInput {
  revisionId: string
  authorUserId?: string
}

export interface InviteClientGrantInput {
  userId: string
  invitedBy?: string
  allowComments?: boolean
  allowDiscussions?: boolean
  allowFiles?: boolean
  allowTime?: boolean
  allowInvoices?: boolean
  allowWiki?: boolean
}

export interface UpdateClientGrantInput {
  allowComments?: boolean
  allowDiscussions?: boolean
  allowFiles?: boolean
  allowTime?: boolean
  allowInvoices?: boolean
  allowWiki?: boolean
}

export interface CreateAttachmentLinkInput {
  url: string
  name?: string
  issueId?: string | null
  milestoneId?: string | null
  createdBy?: string
}

export interface UpdateAttachmentLinkInput {
  url?: string
  name?: string | null
}

export const portalIssueSchema = z.object({
  object: z.literal('portal.issue'),
  id: z.string(),
  projectId: z.string(),
  identifier: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  status: z.string(),
  priority: z.string(),
  milestoneId: z.string().nullable(),
  createdAt: z.number(),
  updatedAt: z.number(),
})
export type PortalIssue = z.infer<typeof portalIssueSchema>
export const portalIssueListSchema = createListSchema(portalIssueSchema)
export type PortalIssueList = z.infer<typeof portalIssueListSchema>

export const portalMilestoneSchema = z.object({
  object: z.literal('portal.milestone'),
  id: z.string(),
  projectId: z.string(),
  key: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  status: z.string(),
  startDate: z.number().nullable(),
  targetDate: z.number().nullable(),
  completedAt: z.number().nullable(),
  createdAt: z.number(),
  updatedAt: z.number(),
})
export type PortalMilestone = z.infer<typeof portalMilestoneSchema>
export const portalMilestoneListSchema = createListSchema(portalMilestoneSchema)
export type PortalMilestoneList = z.infer<typeof portalMilestoneListSchema>

export const portalCommentSchema = z.object({
  object: z.literal('portal.comment'),
  id: z.string(),
  issueId: z.string(),
  authorUserId: z.string().nullable(),
  body: z.string(),
  createdAt: z.number(),
  updatedAt: z.number(),
})
export type PortalComment = z.infer<typeof portalCommentSchema>
export const portalCommentListSchema = createListSchema(portalCommentSchema)
export type PortalCommentList = z.infer<typeof portalCommentListSchema>

export const portalMilestoneCommentSchema = z.object({
  object: z.literal('portal.milestone-comment'),
  id: z.string(),
  milestoneId: z.string(),
  authorUserId: z.string().nullable(),
  body: z.string(),
  createdAt: z.number(),
  updatedAt: z.number(),
})
export type PortalMilestoneComment = z.infer<typeof portalMilestoneCommentSchema>
export const portalMilestoneCommentListSchema = createListSchema(
  portalMilestoneCommentSchema
)
export type PortalMilestoneCommentList = z.infer<
  typeof portalMilestoneCommentListSchema
>

export const portalDiscussionSchema = z.object({
  object: z.literal('portal.discussion'),
  id: z.string(),
  projectId: z.string(),
  title: z.string(),
  body: z.string(),
  pinned: z.boolean(),
  createdAt: z.number(),
  updatedAt: z.number(),
})
export type PortalDiscussion = z.infer<typeof portalDiscussionSchema>
export const portalDiscussionListSchema = createListSchema(portalDiscussionSchema)
export type PortalDiscussionList = z.infer<typeof portalDiscussionListSchema>

export const portalDiscussionDetailSchema = z.object({
  discussion: portalDiscussionSchema,
  posts: z.array(
    z.object({
      object: z.literal('portal.discussion-post'),
      id: z.string(),
      discussionId: z.string(),
      authorUserId: z.string().nullable(),
      body: z.string(),
      createdAt: z.number(),
      updatedAt: z.number(),
    })
  ),
})
export type PortalDiscussionDetail = z.infer<typeof portalDiscussionDetailSchema>

export const portalWikiPageSchema = z.object({
  object: z.literal('portal.wiki-page'),
  id: z.string(),
  projectId: z.string(),
  slug: z.string(),
  title: z.string(),
  body: z.string(),
  parentPageId: z.string().nullable(),
  updatedAt: z.number(),
})
export type PortalWikiPage = z.infer<typeof portalWikiPageSchema>
export const portalWikiPageListSchema = createListSchema(portalWikiPageSchema)
export type PortalWikiPageList = z.infer<typeof portalWikiPageListSchema>

export const portalAttachmentSchema = z.object({
  object: z.literal('portal.attachment'),
  id: z.string(),
  issueId: z.string().nullable(),
  milestoneId: z.string().nullable(),
  url: z.string(),
  name: z.string().nullable(),
  createdAt: z.number(),
})
export type PortalAttachment = z.infer<typeof portalAttachmentSchema>
export const portalAttachmentListSchema = createListSchema(portalAttachmentSchema)
export type PortalAttachmentList = z.infer<typeof portalAttachmentListSchema>

export const portalActivityItemSchema = z.object({
  object: z.literal('portal.activity-item'),
  id: z.string(),
  kind: z.string(),
  subjectType: z.string(),
  subjectId: z.string(),
  type: z.string(),
  createdAt: z.number(),
})
export type PortalActivityItem = z.infer<typeof portalActivityItemSchema>

export const portalActivityFeedSchema = z.object({
  items: z.array(portalActivityItemSchema),
  nextCursor: z.string().nullable(),
  hasMore: z.boolean(),
})
export type PortalActivityFeed = z.infer<typeof portalActivityFeedSchema>

export const portalPhaseHoursSchema = z.object({
  object: z.literal('portal.phase-hours'),
  milestoneId: z.string().nullable(),
  milestoneName: z.string().nullable(),
  hours: z.number(),
})
export type PortalPhaseHours = z.infer<typeof portalPhaseHoursSchema>

export const portalInvoiceSchema = z.object({
  object: z.literal('portal.invoice'),
  invoiceId: z.string(),
  status: z.string(),
  billedHours: z.number(),
  entryCount: z.number(),
})
export type PortalInvoice = z.infer<typeof portalInvoiceSchema>

export const portalCommentArraySchema = z.array(portalCommentSchema)
export type PortalCommentArray = z.infer<typeof portalCommentArraySchema>

export const portalMilestoneCommentArraySchema = z.array(
  portalMilestoneCommentSchema
)
export type PortalMilestoneCommentArray = z.infer<
  typeof portalMilestoneCommentArraySchema
>

export const portalPhaseHoursArraySchema = z.array(portalPhaseHoursSchema)
export type PortalPhaseHoursArray = z.infer<typeof portalPhaseHoursArraySchema>

export const portalInvoiceArraySchema = z.array(portalInvoiceSchema)
export type PortalInvoiceArray = z.infer<typeof portalInvoiceArraySchema>

export interface PortalClientOptions {
  baseUrl?: string
  internalKey?: string
  actingUserId: string
  fetch?: typeof fetch
  requestId?: string
}

export const unfollowResultSchema = z.object({
  unfollowed: z.boolean(),
})
export type UnfollowResult = z.infer<typeof unfollowResultSchema>

export interface ListActivityQuery {
  limit?: number
  cursor?: string
}

export interface ListClientGrantsQuery {
  limit?: number
  startingAfter?: string
  includeRevoked?: boolean
}

export interface PortalListQuery {
  limit?: number
  startingAfter?: string
}

export interface PortalActivityQuery {
  limit?: number
  cursor?: string
}

export const customModuleScopeSchema = z.enum(['org', 'project'])
export type CustomModuleScope = z.infer<typeof customModuleScopeSchema>

export const customModuleSchema = z.object({
  object: z.literal('projects.custom-module'),
  id: z.string(),
  scope: customModuleScopeSchema,
  projectId: z.string().nullable(),
  key: z.string(),
  singularName: z.string(),
  pluralName: z.string(),
  icon: z.string().nullable(),
  version: z.number(),
  restrictedToRoleKeys: z.array(z.string()),
  createdAt: z.number(),
  updatedAt: z.number(),
})
export type CustomModule = z.infer<typeof customModuleSchema>
export const customModuleListSchema = createListSchema(customModuleSchema)
export type CustomModuleList = z.infer<typeof customModuleListSchema>

export const customModuleFieldSchema = z.object({
  object: z.literal('projects.custom-module-field'),
  id: z.string(),
  moduleId: z.string(),
  key: z.string(),
  label: z.string(),
  fieldType: z.string(),
  options: z.unknown(),
  required: z.boolean(),
  position: z.number(),
  createdAt: z.number(),
  updatedAt: z.number(),
})
export type CustomModuleField = z.infer<typeof customModuleFieldSchema>
export const customModuleFieldListSchema = createListSchema(customModuleFieldSchema)
export type CustomModuleFieldList = z.infer<typeof customModuleFieldListSchema>

export const customModuleStatusSchema = z.object({
  object: z.literal('projects.custom-module-status'),
  id: z.string(),
  moduleId: z.string(),
  key: z.string(),
  label: z.string(),
  category: z.enum(['open', 'in-progress', 'done']),
  position: z.number(),
  isDefault: z.boolean(),
  createdAt: z.number(),
  updatedAt: z.number(),
})
export type CustomModuleStatus = z.infer<typeof customModuleStatusSchema>
export const customModuleStatusListSchema = createListSchema(customModuleStatusSchema)
export type CustomModuleStatusList = z.infer<typeof customModuleStatusListSchema>

export const customRecordSchema = z.object({
  object: z.literal('projects.custom-record'),
  id: z.string(),
  moduleId: z.string(),
  moduleKey: z.string(),
  projectId: z.string().nullable(),
  title: z.string(),
  statusKey: z.string(),
  fields: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.array(z.string()), z.null()])),
  createdBy: z.string().nullable(),
  updatedBy: z.string().nullable(),
  createdAt: z.number(),
  updatedAt: z.number(),
})
export type CustomRecord = z.infer<typeof customRecordSchema>
export const customRecordListSchema = createListSchema(customRecordSchema)
export type CustomRecordList = z.infer<typeof customRecordListSchema>

export const customModuleLinkSchema = z.object({
  object: z.literal('projects.custom-module-link'),
  id: z.string(),
  sourceRecordId: z.string(),
  targetType: z.enum(['record', 'work-item', 'project', 'phase']),
  targetId: z.string(),
  relation: z.string(),
  createdBy: z.string().nullable(),
  createdAt: z.number(),
})
export type CustomModuleLink = z.infer<typeof customModuleLinkSchema>
export const customModuleLinkListSchema = createListSchema(customModuleLinkSchema)
export type CustomModuleLinkList = z.infer<typeof customModuleLinkListSchema>

export const customModuleCountRowSchema = z.object({
  key: z.string(),
  label: z.string(),
  count: z.number(),
})
export type CustomModuleCountRow = z.infer<typeof customModuleCountRowSchema>

export const customModuleStatusReportSchema = z.object({
  object: z.literal('projects.custom-module-status-report'),
  moduleId: z.string(),
  moduleKey: z.string(),
  total: z.number(),
  byStatus: z.array(customModuleCountRowSchema),
})
export type CustomModuleStatusReport = z.infer<typeof customModuleStatusReportSchema>

export const customModuleFieldReportSchema = z.object({
  object: z.literal('projects.custom-module-field-report'),
  moduleId: z.string(),
  moduleKey: z.string(),
  fieldKey: z.string(),
  total: z.number(),
  byValue: z.array(customModuleCountRowSchema),
})
export type CustomModuleFieldReport = z.infer<typeof customModuleFieldReportSchema>

export const customModuleCreatedReportSchema = z.object({
  object: z.literal('projects.custom-module-created-report'),
  moduleId: z.string(),
  moduleKey: z.string(),
  from: z.number(),
  to: z.number(),
  total: z.number(),
  perDay: z.array(z.object({ day: z.string(), count: z.number() })),
})
export type CustomModuleCreatedReport = z.infer<typeof customModuleCreatedReportSchema>

export const dashboardWidgetSchema = z.object({
  object: z.literal('projects.dashboard-widget'),
  id: z.string(),
  userId: z.string().nullable(),
  kind: z.enum(['record-count', 'status-breakdown', 'recent-records']),
  moduleId: z.string(),
  config: z.unknown(),
  position: z.number(),
  createdAt: z.number(),
  updatedAt: z.number(),
})
export type DashboardWidget = z.infer<typeof dashboardWidgetSchema>
export const dashboardWidgetListSchema = createListSchema(dashboardWidgetSchema)
export type DashboardWidgetList = z.infer<typeof dashboardWidgetListSchema>

export interface CreateCustomModuleInput {
  scope: 'org' | 'project'
  projectId?: string | null
  key: string
  singularName: string
  pluralName: string
  icon?: string | null
  restrictedToRoleKeys?: string[]
}

export interface UpdateCustomModuleInput {
  scope?: 'org' | 'project'
  projectId?: string | null
  singularName?: string
  pluralName?: string
  icon?: string | null
  restrictedToRoleKeys?: string[] | null
}

export interface CreateCustomModuleFieldInput {
  key: string
  label: string
  fieldType: string
  options?: Array<{ key: string; label: string }>
  required?: boolean
  position?: number
}

export interface UpdateCustomModuleFieldInput {
  label?: string
  fieldType?: string
  options?: Array<{ key: string; label: string }>
  required?: boolean
  position?: number
}

export interface CreateCustomModuleStatusInput {
  key: string
  label: string
  category: 'open' | 'in-progress' | 'done'
  position?: number
  isDefault?: boolean
}

export interface UpdateCustomModuleStatusInput {
  label?: string
  category?: 'open' | 'in-progress' | 'done'
  position?: number
  isDefault?: boolean
}

export interface CustomRecordFieldInput {
  key: string
  value: string | number | boolean | string[] | null
}

export interface CreateCustomRecordInput {
  projectId?: string | null
  title: string
  statusKey?: string
  fields?: CustomRecordFieldInput[]
  createdBy?: string | null
}

export interface UpdateCustomRecordInput {
  projectId?: string | null
  title?: string
  statusKey?: string
  fields?: CustomRecordFieldInput[]
  updatedBy?: string | null
}

export interface ListCustomRecordsQuery {
  limit?: number
  startingAfter?: string
  endingBefore?: string
  status?: string
  projectId?: string
  q?: string
  fieldKey?: string
  fieldValue?: string
}

export interface CreateCustomModuleLinkInput {
  targetType: 'record' | 'work-item' | 'project' | 'phase'
  targetId: string
  relation: string
  createdBy?: string | null
}

export interface GetCustomModuleReportQuery {
  from?: number
  to?: number
  fieldKey?: string
  format?: 'json' | 'csv'
}

export interface CreateDashboardWidgetInput {
  kind: 'record-count' | 'status-breakdown' | 'recent-records'
  moduleId: string
  userId?: string | null
  config?: Record<string, unknown>
  position?: number
}

export interface UpdateDashboardWidgetInput {
  kind?: 'record-count' | 'status-breakdown' | 'recent-records'
  userId?: string | null
  config?: Record<string, unknown>
  position?: number
}

export interface ListDashboardWidgetsQuery {
  moduleId?: string
  userId?: string
}
