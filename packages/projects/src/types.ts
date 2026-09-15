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
  labelIds?: string[]
  customFields?: SetCustomFieldValueInput[]
  position?: number
  actorUserId?: string | null
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

export interface ApplyPresetInput {
  key: 'software-development' | 'business-operations' | 'general'
}
