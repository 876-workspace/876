import type {
  CreateIssueInput,
  CreateProjectInput,
  IssueStatus,
  ListIssuesQuery,
  ListProjectsQuery,
  UpdateIssueInput,
  UpdateProjectInput,
} from '@876/projects/contracts'
import {
  issueOrderSchema,
  issuePrioritySchema,
  issueStatusSchema,
  projectHealthSchema,
  projectStatusSchema,
} from '@876/projects/contracts'
import type { ProjectsOperatorClient } from '@876/projects/operator'
import { z } from 'zod'

import type { Config } from './config'
import {
  formatComment,
  formatComments,
  formatError,
  formatIssue,
  formatIssueEventList,
  formatIssueList,
  formatLabel,
  formatLabelList,
  formatMilestoneList,
  formatProject,
  formatProjectList,
  formatSuccess,
  formatWorkflowStateList,
  formatWorkItemTypeList,
  formatWorkspace,
  type ToolResult,
} from './format'

const timestampSchema = z
  .union([z.number().int().nonnegative(), z.string().trim().min(1)])
  .optional()
  .transform((val, ctx) => {
    if (val === undefined) return undefined
    if (typeof val === 'number') return val
    if (/^\d+$/.test(val)) {
      return parseInt(val, 10)
    }
    const parsed = Date.parse(val)
    if (isNaN(parsed)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Invalid ISO-8601 date string: ${val}`,
      })
      return z.NEVER
    }
    return Math.floor(parsed / 1000)
  })

const workspaceGetArgsSchema = z.object({}).strict()

const projectsListArgsSchema = z
  .object({
    status: projectStatusSchema.optional(),
    lead: z.string().trim().min(1).optional(),
    q: z.string().trim().min(1).optional(),
    includeArchived: z.boolean().optional(),
    limit: z.number().int().min(1).max(100).optional(),
  })
  .strict()

const projectGetArgsSchema = z
  .object({
    project: z.string().trim().min(1),
  })
  .strict()

const projectCreateArgsSchema = z
  .object({
    name: z.string().trim().min(1),
    key: z.string().trim().min(1).optional(),
    description: z.string().trim().optional(),
    leadUserId: z.string().trim().min(1).optional(),
    status: projectStatusSchema.optional(),
    health: projectHealthSchema.optional(),
    targetDate: timestampSchema,
  })
  .strict()

const projectUpdateArgsSchema = z
  .object({
    project: z.string().trim().min(1),
    name: z.string().trim().min(1).optional(),
    key: z.string().trim().min(1).optional(),
    description: z.string().trim().nullable().optional(),
    leadUserId: z.string().trim().min(1).nullable().optional(),
    status: projectStatusSchema.optional(),
    health: projectHealthSchema.optional(),
    targetDate: timestampSchema.nullable(),
  })
  .strict()

const issuesListArgsSchema = z
  .object({
    project: z.string().trim().min(1).optional(),
    status: z.union([issueStatusSchema, z.array(issueStatusSchema)]).optional(),
    priority: z
      .union([issuePrioritySchema, z.array(issuePrioritySchema)])
      .optional(),
    assignee: z.string().trim().min(1).optional(),
    label: z
      .union([z.string().trim().min(1), z.array(z.string().trim().min(1))])
      .optional(),
    parent: z.string().trim().min(1).optional(),
    q: z.string().trim().min(1).optional(),
    updatedSince: timestampSchema,
    order: issueOrderSchema.optional(),
    limit: z.number().int().min(1).max(100).optional(),
  })
  .strict()

const issueGetArgsSchema = z
  .object({
    issue: z.string().trim().min(1),
    includeComments: z.boolean().optional(),
  })
  .strict()

const issueCreateArgsSchema = z
  .object({
    title: z.string().trim().min(1),
    project: z.string().trim().min(1).optional(),
    description: z.string().trim().optional(),
    status: issueStatusSchema.optional(),
    priority: issuePrioritySchema.optional(),
    assigneeUserId: z.string().trim().min(1).optional(),
    parentIssue: z.string().trim().min(1).optional(),
    estimate: z.number().int().min(0).max(100).optional(),
    dueDate: timestampSchema,
    labels: z.array(z.string().trim().min(1)).optional(),
  })
  .strict()

const issueUpdateArgsSchema = z
  .object({
    issue: z.string().trim().min(1),
    title: z.string().trim().min(1).optional(),
    project: z.string().trim().min(1).optional(),
    description: z.string().trim().nullable().optional(),
    status: issueStatusSchema.optional(),
    priority: issuePrioritySchema.optional(),
    assigneeUserId: z.string().trim().min(1).nullable().optional(),
    parentIssue: z.string().trim().min(1).nullable().optional(),
    estimate: z.number().int().min(0).max(100).nullable().optional(),
    dueDate: timestampSchema.nullable(),
    labels: z.array(z.string().trim().min(1)).optional(),
  })
  .strict()

const issueCommentArgsSchema = z
  .object({
    issue: z.string().trim().min(1),
    body: z.string().trim().min(1),
  })
  .strict()

const issueCommentsArgsSchema = z
  .object({
    issue: z.string().trim().min(1),
    limit: z.number().int().min(1).max(100).optional(),
  })
  .strict()

const issueEventsArgsSchema = z
  .object({
    issue: z.string().trim().min(1),
  })
  .strict()

const labelsListArgsSchema = z.object({}).strict()

const workItemTypesListArgsSchema = z.object({}).strict()

const workflowStatesListArgsSchema = z.object({}).strict()

const milestonesListArgsSchema = z
  .object({
    projectId: z.string().trim().min(1),
    status: z.enum(['open', 'completed', 'canceled']).optional(),
  })
  .strict()

const labelCreateArgsSchema = z
  .object({
    name: z.string().trim().min(1),
    color: z.string().trim().min(1).optional(),
    description: z.string().trim().optional(),
  })
  .strict()

async function resolveProjectId(
  client: ProjectsOperatorClient,
  organizationId: string,
  projectOrKey: string
): Promise<
  | { id: string; error: null }
  | { id: null; error: { code: string; message: string } }
> {
  if (projectOrKey.startsWith('prj_')) {
    return { id: projectOrKey, error: null }
  }

  const listRes = await client.projects.list(organizationId, {
    limit: 100,
    includeArchived: true,
  })
  if (listRes.error !== null) {
    return { id: null, error: listRes.error }
  }

  const upper = projectOrKey.toUpperCase()
  const found = listRes.data.data.find(
    (p) => p.key.toUpperCase() === upper || p.id === projectOrKey
  )
  if (!found) {
    return {
      id: null,
      error: {
        code: 'projects/project-not-found',
        message: `Project not found for key: ${projectOrKey}`,
      },
    }
  }

  return { id: found.id, error: null }
}

export async function handleWorkspaceGet(
  client: ProjectsOperatorClient,
  config: Config,
  args: unknown
): Promise<ToolResult> {
  const parsed = workspaceGetArgsSchema.safeParse(args ?? {})
  if (!parsed.success) {
    return formatError({
      code: 'validation/invalid-arguments',
      message: parsed.error.issues
        .map((i) => `${i.path.join('.')}: ${i.message}`)
        .join(', '),
    })
  }

  const tenantRes = await client.tenants.retrieve(config.organizationId)
  if (tenantRes.error !== null) {
    return formatError(tenantRes.error)
  }

  const projectsRes = await client.projects.list(config.organizationId, {
    limit: 100,
  })
  if (projectsRes.error !== null) {
    return formatError(projectsRes.error)
  }

  const openStatuses: IssueStatus[] = [
    'backlog',
    'todo',
    'in-progress',
    'in-review',
  ]
  const projectEntries = await Promise.all(
    projectsRes.data.data.map(async (project) => {
      const issueRes = await client.issues.list(config.organizationId, {
        project: project.id,
        status: openStatuses,
        limit: 1,
      })
      const openIssueCount = issueRes.data?.total_count ?? 0
      return { project, openIssueCount }
    })
  )

  return formatSuccess(formatWorkspace(tenantRes.data, projectEntries))
}

export async function handleProjectsList(
  client: ProjectsOperatorClient,
  config: Config,
  args: unknown
): Promise<ToolResult> {
  const parsed = projectsListArgsSchema.safeParse(args ?? {})
  if (!parsed.success) {
    return formatError({
      code: 'validation/invalid-arguments',
      message: parsed.error.issues
        .map((i) => `${i.path.join('.')}: ${i.message}`)
        .join(', '),
    })
  }

  const query: ListProjectsQuery = {}
  if (parsed.data.status !== undefined) query.status = parsed.data.status
  if (parsed.data.lead !== undefined) query.lead = parsed.data.lead
  if (parsed.data.q !== undefined) query.q = parsed.data.q
  if (parsed.data.includeArchived !== undefined) {
    query.includeArchived = parsed.data.includeArchived
  }
  if (parsed.data.limit !== undefined) query.limit = parsed.data.limit

  const result = await client.projects.list(config.organizationId, query)
  if (result.error !== null) {
    return formatError(result.error)
  }
  return formatSuccess(formatProjectList(result.data))
}

export async function handleProjectGet(
  client: ProjectsOperatorClient,
  config: Config,
  args: unknown
): Promise<ToolResult> {
  const parsed = projectGetArgsSchema.safeParse(args)
  if (!parsed.success) {
    return formatError({
      code: 'validation/invalid-arguments',
      message: parsed.error.issues
        .map((i) => `${i.path.join('.')}: ${i.message}`)
        .join(', '),
    })
  }

  const resolved = await resolveProjectId(
    client,
    config.organizationId,
    parsed.data.project
  )
  if (resolved.error !== null) {
    return formatError(resolved.error)
  }

  const result = await client.projects.retrieve(
    config.organizationId,
    resolved.id
  )
  if (result.error !== null) {
    return formatError(result.error)
  }
  return formatSuccess(formatProject(result.data))
}

export async function handleProjectCreate(
  client: ProjectsOperatorClient,
  config: Config,
  args: unknown
): Promise<ToolResult> {
  const parsed = projectCreateArgsSchema.safeParse(args)
  if (!parsed.success) {
    return formatError({
      code: 'validation/invalid-arguments',
      message: parsed.error.issues
        .map((i) => `${i.path.join('.')}: ${i.message}`)
        .join(', '),
    })
  }

  const input: CreateProjectInput = {
    name: parsed.data.name,
    ...(parsed.data.key !== undefined ? { key: parsed.data.key } : {}),
    ...(parsed.data.description !== undefined
      ? { description: parsed.data.description }
      : {}),
    ...(parsed.data.leadUserId !== undefined
      ? { leadUserId: parsed.data.leadUserId }
      : {}),
    ...(parsed.data.status !== undefined ? { status: parsed.data.status } : {}),
    ...(parsed.data.health !== undefined ? { health: parsed.data.health } : {}),
    ...(parsed.data.targetDate !== undefined
      ? { targetDate: parsed.data.targetDate }
      : {}),
  }

  const result = await client.projects.create(config.organizationId, input)
  if (result.error !== null) {
    return formatError(result.error)
  }
  return formatSuccess(formatProject(result.data))
}

export async function handleProjectUpdate(
  client: ProjectsOperatorClient,
  config: Config,
  args: unknown
): Promise<ToolResult> {
  const parsed = projectUpdateArgsSchema.safeParse(args)
  if (!parsed.success) {
    return formatError({
      code: 'validation/invalid-arguments',
      message: parsed.error.issues
        .map((i) => `${i.path.join('.')}: ${i.message}`)
        .join(', '),
    })
  }

  const resolved = await resolveProjectId(
    client,
    config.organizationId,
    parsed.data.project
  )
  if (resolved.error !== null) {
    return formatError(resolved.error)
  }

  const input: UpdateProjectInput = {}
  if (parsed.data.name !== undefined) input.name = parsed.data.name
  if (parsed.data.key !== undefined) input.key = parsed.data.key
  if (parsed.data.description !== undefined) {
    input.description = parsed.data.description
  }
  if (parsed.data.leadUserId !== undefined) {
    input.leadUserId = parsed.data.leadUserId
  }
  if (parsed.data.status !== undefined) input.status = parsed.data.status
  if (parsed.data.health !== undefined) input.health = parsed.data.health
  if (parsed.data.targetDate !== undefined) {
    input.targetDate = parsed.data.targetDate
  }

  const result = await client.projects.update(
    config.organizationId,
    resolved.id,
    input
  )
  if (result.error !== null) {
    return formatError(result.error)
  }
  return formatSuccess(formatProject(result.data))
}

export async function handleIssuesList(
  client: ProjectsOperatorClient,
  config: Config,
  args: unknown
): Promise<ToolResult> {
  const parsed = issuesListArgsSchema.safeParse(args ?? {})
  if (!parsed.success) {
    return formatError({
      code: 'validation/invalid-arguments',
      message: parsed.error.issues
        .map((i) => `${i.path.join('.')}: ${i.message}`)
        .join(', '),
    })
  }

  const query: ListIssuesQuery = {}
  if (parsed.data.project !== undefined) query.project = parsed.data.project
  if (parsed.data.status !== undefined) query.status = parsed.data.status
  if (parsed.data.priority !== undefined) query.priority = parsed.data.priority
  if (parsed.data.assignee !== undefined) query.assignee = parsed.data.assignee
  if (parsed.data.label !== undefined) query.label = parsed.data.label
  if (parsed.data.parent !== undefined) query.parent = parsed.data.parent
  if (parsed.data.q !== undefined) query.q = parsed.data.q
  if (parsed.data.updatedSince !== undefined) {
    query.updatedSince = parsed.data.updatedSince
  }
  if (parsed.data.order !== undefined) query.order = parsed.data.order
  if (parsed.data.limit !== undefined) query.limit = parsed.data.limit

  const result = await client.issues.list(config.organizationId, query)
  if (result.error !== null) {
    return formatError(result.error)
  }
  return formatSuccess(formatIssueList(result.data))
}

export async function handleIssueGet(
  client: ProjectsOperatorClient,
  config: Config,
  args: unknown
): Promise<ToolResult> {
  const parsed = issueGetArgsSchema.safeParse(args)
  if (!parsed.success) {
    return formatError({
      code: 'validation/invalid-arguments',
      message: parsed.error.issues
        .map((i) => `${i.path.join('.')}: ${i.message}`)
        .join(', '),
    })
  }

  const result = await client.issues.retrieve(
    config.organizationId,
    parsed.data.issue
  )
  if (result.error !== null) {
    return formatError(result.error)
  }
  if (parsed.data.includeComments === false)
    return formatSuccess(formatIssue(result.data))

  const comments = await client.comments.list(
    config.organizationId,
    parsed.data.issue
  )
  if (comments.error !== null) return formatError(comments.error)

  return formatSuccess(
    `${formatIssue(result.data)}\n\n${formatComments(comments.data.data)}`
  )
}

export async function handleIssueCreate(
  client: ProjectsOperatorClient,
  config: Config,
  args: unknown
): Promise<ToolResult> {
  const parsed = issueCreateArgsSchema.safeParse(args)
  if (!parsed.success) {
    return formatError({
      code: 'validation/invalid-arguments',
      message: parsed.error.issues
        .map((i) => `${i.path.join('.')}: ${i.message}`)
        .join(', '),
    })
  }

  const input: CreateIssueInput = {
    title: parsed.data.title,
    ...(parsed.data.project !== undefined
      ? { projectId: parsed.data.project }
      : {}),
    ...(parsed.data.description !== undefined
      ? { description: parsed.data.description }
      : {}),
    ...(parsed.data.status !== undefined ? { status: parsed.data.status } : {}),
    ...(parsed.data.priority !== undefined
      ? { priority: parsed.data.priority }
      : {}),
    ...(parsed.data.assigneeUserId !== undefined
      ? { assigneeUserId: parsed.data.assigneeUserId }
      : {}),
    ...(parsed.data.parentIssue !== undefined
      ? { parentIssueId: parsed.data.parentIssue }
      : {}),
    ...(parsed.data.estimate !== undefined
      ? { estimate: parsed.data.estimate }
      : {}),
    ...(parsed.data.dueDate !== undefined
      ? { dueDate: parsed.data.dueDate }
      : {}),
    ...(parsed.data.labels !== undefined
      ? { labelIds: parsed.data.labels }
      : {}),
    ...(config.defaultUserId ? { creatorUserId: config.defaultUserId } : {}),
  }

  const result = await client.issues.create(config.organizationId, input)
  if (result.error !== null) {
    return formatError(result.error)
  }
  return formatSuccess(formatIssue(result.data))
}

export async function handleIssueUpdate(
  client: ProjectsOperatorClient,
  config: Config,
  args: unknown
): Promise<ToolResult> {
  const parsed = issueUpdateArgsSchema.safeParse(args)
  if (!parsed.success) {
    return formatError({
      code: 'validation/invalid-arguments',
      message: parsed.error.issues
        .map((i) => `${i.path.join('.')}: ${i.message}`)
        .join(', '),
    })
  }

  const input: UpdateIssueInput = {}
  if (parsed.data.title !== undefined) input.title = parsed.data.title
  if (parsed.data.project !== undefined) input.projectId = parsed.data.project
  if (parsed.data.description !== undefined) {
    input.description = parsed.data.description
  }
  if (parsed.data.status !== undefined) input.status = parsed.data.status
  if (parsed.data.priority !== undefined) input.priority = parsed.data.priority
  if (parsed.data.assigneeUserId !== undefined) {
    input.assigneeUserId = parsed.data.assigneeUserId
  }
  if (parsed.data.parentIssue !== undefined) {
    input.parentIssueId = parsed.data.parentIssue
  }
  if (parsed.data.estimate !== undefined) input.estimate = parsed.data.estimate
  if (parsed.data.dueDate !== undefined) input.dueDate = parsed.data.dueDate
  if (parsed.data.labels !== undefined) input.labelIds = parsed.data.labels
  if (config.defaultUserId) input.actorUserId = config.defaultUserId

  const result = await client.issues.update(
    config.organizationId,
    parsed.data.issue,
    input
  )
  if (result.error !== null) {
    return formatError(result.error)
  }
  return formatSuccess(formatIssue(result.data))
}

export async function handleIssueComment(
  client: ProjectsOperatorClient,
  config: Config,
  args: unknown
): Promise<ToolResult> {
  const parsed = issueCommentArgsSchema.safeParse(args)
  if (!parsed.success) {
    return formatError({
      code: 'validation/invalid-arguments',
      message: parsed.error.issues
        .map((i) => `${i.path.join('.')}: ${i.message}`)
        .join(', '),
    })
  }

  const result = await client.comments.create(
    config.organizationId,
    parsed.data.issue,
    {
      body: parsed.data.body,
      ...(config.defaultUserId ? { authorUserId: config.defaultUserId } : {}),
    }
  )
  if (result.error !== null) {
    return formatError(result.error)
  }
  return formatSuccess(formatComment(result.data))
}

export async function handleIssueComments(
  client: ProjectsOperatorClient,
  config: Config,
  args: unknown
): Promise<ToolResult> {
  const parsed = issueCommentsArgsSchema.safeParse(args)
  if (!parsed.success) {
    return formatError({
      code: 'validation/invalid-arguments',
      message: parsed.error.issues
        .map((i) => `${i.path.join('.')}: ${i.message}`)
        .join(', '),
    })
  }

  const result = await client.comments.list(
    config.organizationId,
    parsed.data.issue,
    {
      ...(parsed.data.limit !== undefined ? { limit: parsed.data.limit } : {}),
    }
  )
  if (result.error !== null) return formatError(result.error)

  return formatSuccess(formatComments(result.data.data))
}

export async function handleIssueEvents(
  client: ProjectsOperatorClient,
  config: Config,
  args: unknown
): Promise<ToolResult> {
  const parsed = issueEventsArgsSchema.safeParse(args)
  if (!parsed.success) {
    return formatError({
      code: 'validation/invalid-arguments',
      message: parsed.error.issues
        .map((i) => `${i.path.join('.')}: ${i.message}`)
        .join(', '),
    })
  }

  const result = await client.issues.events.list(
    config.organizationId,
    parsed.data.issue
  )
  if (result.error !== null) {
    return formatError(result.error)
  }
  return formatSuccess(formatIssueEventList(result.data))
}

export async function handleLabelsList(
  client: ProjectsOperatorClient,
  config: Config,
  args: unknown
): Promise<ToolResult> {
  const parsed = labelsListArgsSchema.safeParse(args ?? {})
  if (!parsed.success) {
    return formatError({
      code: 'validation/invalid-arguments',
      message: parsed.error.issues
        .map((i) => `${i.path.join('.')}: ${i.message}`)
        .join(', '),
    })
  }

  const result = await client.labels.list(config.organizationId)
  if (result.error !== null) {
    return formatError(result.error)
  }
  return formatSuccess(formatLabelList(result.data))
}

export async function handleWorkItemTypesList(
  client: ProjectsOperatorClient,
  config: Config,
  args: unknown
): Promise<ToolResult> {
  const parsed = workItemTypesListArgsSchema.safeParse(args ?? {})
  if (!parsed.success) {
    return formatError({
      code: 'validation/invalid-arguments',
      message: parsed.error.issues
        .map((i) => `${i.path.join('.')}: ${i.message}`)
        .join(', '),
    })
  }

  const result = await client.workItemTypes.list(config.organizationId)
  if (result.error !== null) return formatError(result.error)
  return formatSuccess(
    formatWorkItemTypeList({
      ...result.data,
      data: result.data.data.filter((type) => type.archivedAt === null),
    })
  )
}

export async function handleWorkflowStatesList(
  client: ProjectsOperatorClient,
  config: Config,
  args: unknown
): Promise<ToolResult> {
  const parsed = workflowStatesListArgsSchema.safeParse(args ?? {})
  if (!parsed.success) {
    return formatError({
      code: 'validation/invalid-arguments',
      message: parsed.error.issues
        .map((i) => `${i.path.join('.')}: ${i.message}`)
        .join(', '),
    })
  }

  const result = await client.workflowStates.list(config.organizationId)
  if (result.error !== null) return formatError(result.error)
  return formatSuccess(
    formatWorkflowStateList({
      ...result.data,
      data: result.data.data.filter((state) => state.archivedAt === null),
    })
  )
}

export async function handleMilestonesList(
  client: ProjectsOperatorClient,
  config: Config,
  args: unknown
): Promise<ToolResult> {
  const parsed = milestonesListArgsSchema.safeParse(args)
  if (!parsed.success) {
    return formatError({
      code: 'validation/invalid-arguments',
      message: parsed.error.issues
        .map((i) => `${i.path.join('.')}: ${i.message}`)
        .join(', '),
    })
  }

  const result = await client.milestones.list(
    config.organizationId,
    parsed.data.projectId,
    parsed.data.status !== undefined ? { status: parsed.data.status } : {}
  )
  if (result.error !== null) return formatError(result.error)
  return formatSuccess(formatMilestoneList(result.data))
}

export async function handleLabelCreate(
  client: ProjectsOperatorClient,
  config: Config,
  args: unknown
): Promise<ToolResult> {
  const parsed = labelCreateArgsSchema.safeParse(args)
  if (!parsed.success) {
    return formatError({
      code: 'validation/invalid-arguments',
      message: parsed.error.issues
        .map((i) => `${i.path.join('.')}: ${i.message}`)
        .join(', '),
    })
  }

  const result = await client.labels.create(config.organizationId, {
    name: parsed.data.name,
    ...(parsed.data.color !== undefined ? { color: parsed.data.color } : {}),
    ...(parsed.data.description !== undefined
      ? { description: parsed.data.description }
      : {}),
  })
  if (result.error !== null) {
    return formatError(result.error)
  }
  return formatSuccess(formatLabel(result.data))
}

export const HANDLERS: Record<
  string,
  (
    client: ProjectsOperatorClient,
    config: Config,
    args: unknown
  ) => Promise<ToolResult>
> = {
  workspace_get: handleWorkspaceGet,
  projects_list: handleProjectsList,
  project_get: handleProjectGet,
  project_create: handleProjectCreate,
  project_update: handleProjectUpdate,
  issues_list: handleIssuesList,
  issue_get: handleIssueGet,
  issue_create: handleIssueCreate,
  issue_update: handleIssueUpdate,
  issue_comment: handleIssueComment,
  issue_comments: handleIssueComments,
  issue_events: handleIssueEvents,
  labels_list: handleLabelsList,
  work_item_types_list: handleWorkItemTypesList,
  workflow_states_list: handleWorkflowStatesList,
  milestones_list: handleMilestonesList,
  label_create: handleLabelCreate,
}
