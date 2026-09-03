import { z } from 'zod'

export interface ClientError {
  code: string
  message: string
}

export type Result<T> =
  | { data: T; error: null }
  | { data: null; error: ClientError }

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
export const issueStatusSchema = z.enum(ISSUE_STATUSES)
export type IssueStatus = z.infer<typeof issueStatusSchema>

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
  status: issueStatusSchema,
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

export const labelListSchema = createListSchema(labelSchema)
export type LabelList = z.infer<typeof labelListSchema>

export const commentListSchema = createListSchema(commentSchema)
export type CommentList = z.infer<typeof commentListSchema>

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
  position?: number
}

export interface AddProjectMemberInput {
  userId: string
  role?: ProjectMemberRole
}

export interface ListIssuesQuery {
  project?: string
  status?: IssueStatus | IssueStatus[] | string | string[]
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
  status?: IssueStatus
  priority?: IssuePriority
  assigneeUserId?: string | null
  creatorUserId?: string | null
  parentIssueId?: string | null
  estimate?: number | null
  dueDate?: number | null
  labelIds?: string[]
  position?: number
}

export interface UpdateIssueInput {
  projectId?: string
  title?: string
  description?: string | null
  status?: IssueStatus
  priority?: IssuePriority
  assigneeUserId?: string | null
  creatorUserId?: string | null
  parentIssueId?: string | null
  estimate?: number | null
  dueDate?: number | null
  labelIds?: string[]
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
