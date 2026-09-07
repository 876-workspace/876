import type {
  CreateIssueInput,
  CreateProjectInput,
  ListIssuesQuery,
  ListProjectsQuery,
  UpdateIssueInput,
  UpdateProjectInput,
} from '@876/projects/contracts'
import type { ProjectsOperatorClient } from '@876/projects/operator'

import type { Config } from './config'
import {
  formatComment,
  formatComments,
  formatIssue,
  formatIssueEventList,
  formatIssueList,
  formatLabel,
  formatLabelList,
  formatMilestoneList,
  formatProject,
  formatProjectList,
  formatWorkflowStateList,
  formatWorkItemTypeList,
  formatWorkspace,
  toolError,
  toolSuccess,
  type ToolResult,
} from './format'
import {
  issueCommentSchema,
  issueCommentsSchema,
  issueCreateSchema,
  issueEventsSchema,
  issueGetSchema,
  issuesListSchema,
  issueUpdateSchema,
  labelCreateSchema,
  labelsListSchema,
  milestonesListSchema,
  projectCreateSchema,
  projectGetSchema,
  projectsListSchema,
  projectUpdateSchema,
  workflowStatesListSchema,
  workItemTypesListSchema,
  workspaceGetSchema,
} from './schemas'

async function resolveProjectId(
  client: ProjectsOperatorClient,
  organizationId: string,
  projectOrKey: string
): Promise<
  | { id: string; error: null }
  | { id: null; error: { code: string; message: string } }
> {
  if (projectOrKey.startsWith('prj_')) return { id: projectOrKey, error: null }

  const listRes = await client.projects.list(organizationId, {
    limit: 100,
    includeArchived: true,
  })
  if (listRes.error !== null) return { id: null, error: listRes.error }

  const upper = projectOrKey.toUpperCase()
  const found = listRes.data.data.find(
    (p) => p.key.toUpperCase() === upper || p.id === projectOrKey
  )
  if (!found)
    return {
      id: null,
      error: {
        code: 'projects/project-not-found',
        message: `Project not found for key: ${projectOrKey}`,
      },
    }

  return { id: found.id, error: null }
}

export async function handleWorkspaceGet(
  client: ProjectsOperatorClient,
  config: Config,
  args: unknown
): Promise<ToolResult> {
  const parsed = workspaceGetSchema.safeParse(args ?? {})
  if (!parsed.success)
    return toolError({
      code: 'validation/invalid-arguments',
      message: parsed.error.issues
        .map((i) => `${i.path.join('.')}: ${i.message}`)
        .join(', '),
    })

  const tenantRes = await client.tenants.retrieve(config.organizationId)
  if (tenantRes.error !== null) return toolError(tenantRes.error)

  const [projectsRes, workflowRes] = await Promise.all([
    client.projects.list(config.organizationId, { limit: 100 }),
    client.workflowStates.list(config.organizationId),
  ])
  if (projectsRes.error !== null) return toolError(projectsRes.error)
  if (workflowRes.error !== null) return toolError(workflowRes.error)

  const openStatuses = workflowRes.data.data
    .filter(
      (state) =>
        state.archivedAt === null &&
        state.category !== 'completed' &&
        state.category !== 'canceled'
    )
    .map((state) => state.key)

  const projectEntries = await Promise.all(
    projectsRes.data.data.map(async (project) => {
      const issueRes = await client.issues.list(config.organizationId, {
        project: project.id,
        ...(openStatuses.length > 0 ? { status: openStatuses } : {}),
        limit: 1,
      })
      const openIssueCount = issueRes.data?.total_count ?? 0
      return { project, openIssueCount }
    })
  )

  return toolSuccess(formatWorkspace(tenantRes.data, projectEntries), {
    tenant: tenantRes.data,
    projects: projectEntries,
  })
}

export async function handleProjectsList(
  client: ProjectsOperatorClient,
  config: Config,
  args: unknown
): Promise<ToolResult> {
  const parsed = projectsListSchema.safeParse(args ?? {})
  if (!parsed.success)
    return toolError({
      code: 'validation/invalid-arguments',
      message: parsed.error.issues
        .map((i) => `${i.path.join('.')}: ${i.message}`)
        .join(', '),
    })

  const query: ListProjectsQuery = {}
  if (parsed.data.status !== undefined) query.status = parsed.data.status
  if (parsed.data.lead !== undefined) query.lead = parsed.data.lead
  if (parsed.data.q !== undefined) query.q = parsed.data.q
  if (parsed.data.includeArchived !== undefined)
    query.includeArchived = parsed.data.includeArchived
  if (parsed.data.limit !== undefined) query.limit = parsed.data.limit

  const result = await client.projects.list(config.organizationId, query)
  if (result.error !== null) return toolError(result.error)

  return toolSuccess(formatProjectList(result.data), {
    projects: result.data.data,
    totalCount: result.data.total_count,
    hasMore: result.data.has_more,
  })
}

export async function handleProjectGet(
  client: ProjectsOperatorClient,
  config: Config,
  args: unknown
): Promise<ToolResult> {
  const parsed = projectGetSchema.safeParse(args)
  if (!parsed.success)
    return toolError({
      code: 'validation/invalid-arguments',
      message: parsed.error.issues
        .map((i) => `${i.path.join('.')}: ${i.message}`)
        .join(', '),
    })

  const resolved = await resolveProjectId(
    client,
    config.organizationId,
    parsed.data.project
  )
  if (resolved.error !== null) return toolError(resolved.error)

  const result = await client.projects.retrieve(
    config.organizationId,
    resolved.id
  )
  if (result.error !== null) return toolError(result.error)

  return toolSuccess(formatProject(result.data), {
    project: result.data,
  })
}

export async function handleProjectCreate(
  client: ProjectsOperatorClient,
  config: Config,
  args: unknown
): Promise<ToolResult> {
  const parsed = projectCreateSchema.safeParse(args)
  if (!parsed.success)
    return toolError({
      code: 'validation/invalid-arguments',
      message: parsed.error.issues
        .map((i) => `${i.path.join('.')}: ${i.message}`)
        .join(', '),
    })

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
    ...(parsed.data.defaultWorkItemTypeId !== undefined
      ? { defaultWorkItemTypeId: parsed.data.defaultWorkItemTypeId }
      : {}),
  }

  const result = await client.projects.create(config.organizationId, input)
  if (result.error !== null) return toolError(result.error)

  return toolSuccess(formatProject(result.data), {
    project: result.data,
  })
}

export async function handleProjectUpdate(
  client: ProjectsOperatorClient,
  config: Config,
  args: unknown
): Promise<ToolResult> {
  const parsed = projectUpdateSchema.safeParse(args)
  if (!parsed.success)
    return toolError({
      code: 'validation/invalid-arguments',
      message: parsed.error.issues
        .map((i) => `${i.path.join('.')}: ${i.message}`)
        .join(', '),
    })

  const resolved = await resolveProjectId(
    client,
    config.organizationId,
    parsed.data.project
  )
  if (resolved.error !== null) return toolError(resolved.error)

  const input: UpdateProjectInput = {}
  if (parsed.data.name !== undefined) input.name = parsed.data.name
  if (parsed.data.key !== undefined) input.key = parsed.data.key
  if (parsed.data.description !== undefined)
    input.description = parsed.data.description
  if (parsed.data.leadUserId !== undefined)
    input.leadUserId = parsed.data.leadUserId
  if (parsed.data.status !== undefined) input.status = parsed.data.status
  if (parsed.data.health !== undefined) input.health = parsed.data.health
  if (parsed.data.targetDate !== undefined)
    input.targetDate = parsed.data.targetDate
  if (parsed.data.defaultWorkItemTypeId !== undefined)
    input.defaultWorkItemTypeId = parsed.data.defaultWorkItemTypeId

  const result = await client.projects.update(
    config.organizationId,
    resolved.id,
    input
  )
  if (result.error !== null) return toolError(result.error)

  return toolSuccess(formatProject(result.data), {
    project: result.data,
  })
}

export async function handleIssuesList(
  client: ProjectsOperatorClient,
  config: Config,
  args: unknown
): Promise<ToolResult> {
  const parsed = issuesListSchema.safeParse(args ?? {})
  if (!parsed.success)
    return toolError({
      code: 'validation/invalid-arguments',
      message: parsed.error.issues
        .map((i) => `${i.path.join('.')}: ${i.message}`)
        .join(', '),
    })

  const query: ListIssuesQuery = {}
  if (parsed.data.project !== undefined) query.project = parsed.data.project
  if (parsed.data.status !== undefined) query.status = parsed.data.status
  if (parsed.data.priority !== undefined) query.priority = parsed.data.priority
  if (parsed.data.assignee !== undefined) query.assignee = parsed.data.assignee
  if (parsed.data.label !== undefined) query.label = parsed.data.label
  if (parsed.data.parent !== undefined) query.parent = parsed.data.parent
  if (parsed.data.q !== undefined) query.q = parsed.data.q
  if (parsed.data.updatedSince !== undefined)
    query.updatedSince = parsed.data.updatedSince
  if (parsed.data.order !== undefined) query.order = parsed.data.order
  if (parsed.data.limit !== undefined) query.limit = parsed.data.limit

  const result = await client.issues.list(config.organizationId, query)
  if (result.error !== null) return toolError(result.error)

  return toolSuccess(formatIssueList(result.data), {
    issues: result.data.data,
    totalCount: result.data.total_count,
    hasMore: result.data.has_more,
  })
}

export async function handleIssueGet(
  client: ProjectsOperatorClient,
  config: Config,
  args: unknown
): Promise<ToolResult> {
  const parsed = issueGetSchema.safeParse(args)
  if (!parsed.success)
    return toolError({
      code: 'validation/invalid-arguments',
      message: parsed.error.issues
        .map((i) => `${i.path.join('.')}: ${i.message}`)
        .join(', '),
    })

  const includeComments = parsed.data.includeComments !== false

  const [result, comments] = await Promise.all([
    client.issues.retrieve(config.organizationId, parsed.data.issue),
    includeComments
      ? client.comments.list(config.organizationId, parsed.data.issue)
      : Promise.resolve(null),
  ])

  if (result.error !== null) return toolError(result.error)
  if (comments && comments.error !== null) return toolError(comments.error)

  const commentsData = comments?.data.data
  const structuredContent = {
    issue: result.data,
    ...(commentsData !== undefined ? { comments: commentsData } : {}),
  }

  return toolSuccess(
    includeComments && commentsData && commentsData.length > 0
      ? `${formatIssue(result.data)}\n\n${formatComments(commentsData)}`
      : formatIssue(result.data),
    structuredContent
  )
}

export async function handleIssueCreate(
  client: ProjectsOperatorClient,
  config: Config,
  args: unknown
): Promise<ToolResult> {
  const parsed = issueCreateSchema.safeParse(args)
  if (!parsed.success)
    return toolError({
      code: 'validation/invalid-arguments',
      message: parsed.error.issues
        .map((i) => `${i.path.join('.')}: ${i.message}`)
        .join(', '),
    })

  const input: CreateIssueInput = {
    title: parsed.data.title,
    ...(parsed.data.project !== undefined
      ? { projectId: parsed.data.project }
      : {}),
    ...(parsed.data.description !== undefined
      ? { description: parsed.data.description }
      : {}),
    ...(parsed.data.status !== undefined ? { status: parsed.data.status } : {}),
    ...(parsed.data.typeKey !== undefined
      ? { typeKey: parsed.data.typeKey }
      : {}),
    ...(parsed.data.milestoneId !== undefined
      ? { milestoneId: parsed.data.milestoneId }
      : {}),
    ...(parsed.data.customFields !== undefined
      ? { customFields: parsed.data.customFields }
      : {}),
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
  if (result.error !== null) return toolError(result.error)

  return toolSuccess(formatIssue(result.data), {
    issue: result.data,
  })
}

export async function handleIssueUpdate(
  client: ProjectsOperatorClient,
  config: Config,
  args: unknown
): Promise<ToolResult> {
  const parsed = issueUpdateSchema.safeParse(args)
  if (!parsed.success)
    return toolError({
      code: 'validation/invalid-arguments',
      message: parsed.error.issues
        .map((i) => `${i.path.join('.')}: ${i.message}`)
        .join(', '),
    })

  const input: UpdateIssueInput = {}
  if (parsed.data.title !== undefined) input.title = parsed.data.title
  if (parsed.data.project !== undefined) input.projectId = parsed.data.project
  if (parsed.data.description !== undefined)
    input.description = parsed.data.description
  if (parsed.data.status !== undefined) input.status = parsed.data.status
  if (parsed.data.typeKey !== undefined) input.typeKey = parsed.data.typeKey
  if (parsed.data.milestoneId !== undefined)
    input.milestoneId = parsed.data.milestoneId
  if (parsed.data.customFields !== undefined)
    input.customFields = parsed.data.customFields
  if (parsed.data.priority !== undefined) input.priority = parsed.data.priority
  if (parsed.data.assigneeUserId !== undefined)
    input.assigneeUserId = parsed.data.assigneeUserId
  if (parsed.data.parentIssue !== undefined)
    input.parentIssueId = parsed.data.parentIssue
  if (parsed.data.estimate !== undefined) input.estimate = parsed.data.estimate
  if (parsed.data.dueDate !== undefined) input.dueDate = parsed.data.dueDate
  if (parsed.data.labels !== undefined) input.labelIds = parsed.data.labels
  if (config.defaultUserId) input.actorUserId = config.defaultUserId

  const result = await client.issues.update(
    config.organizationId,
    parsed.data.issue,
    input
  )
  if (result.error !== null) return toolError(result.error)

  return toolSuccess(formatIssue(result.data), {
    issue: result.data,
  })
}

export async function handleIssueComment(
  client: ProjectsOperatorClient,
  config: Config,
  args: unknown
): Promise<ToolResult> {
  const parsed = issueCommentSchema.safeParse(args)
  if (!parsed.success)
    return toolError({
      code: 'validation/invalid-arguments',
      message: parsed.error.issues
        .map((i) => `${i.path.join('.')}: ${i.message}`)
        .join(', '),
    })

  if (!config.defaultUserId)
    return toolError({
      code: 'projects/comment-author-required',
      message:
        'A default user ID is required to create comments so ownership remains enforceable.',
    })

  const result = await client.comments.create(
    config.organizationId,
    parsed.data.issue,
    { body: parsed.data.body, authorUserId: config.defaultUserId }
  )
  if (result.error !== null) return toolError(result.error)

  return toolSuccess(formatComment(result.data), {
    comment: result.data,
  })
}

export async function handleIssueComments(
  client: ProjectsOperatorClient,
  config: Config,
  args: unknown
): Promise<ToolResult> {
  const parsed = issueCommentsSchema.safeParse(args)
  if (!parsed.success)
    return toolError({
      code: 'validation/invalid-arguments',
      message: parsed.error.issues
        .map((i) => `${i.path.join('.')}: ${i.message}`)
        .join(', '),
    })

  const result = await client.comments.list(
    config.organizationId,
    parsed.data.issue,
    {
      ...(parsed.data.limit !== undefined ? { limit: parsed.data.limit } : {}),
    }
  )
  if (result.error !== null) return toolError(result.error)

  return toolSuccess(formatComments(result.data.data), {
    comments: result.data.data,
  })
}

export async function handleIssueEvents(
  client: ProjectsOperatorClient,
  config: Config,
  args: unknown
): Promise<ToolResult> {
  const parsed = issueEventsSchema.safeParse(args)
  if (!parsed.success)
    return toolError({
      code: 'validation/invalid-arguments',
      message: parsed.error.issues
        .map((i) => `${i.path.join('.')}: ${i.message}`)
        .join(', '),
    })

  const result = await client.issues.events.list(
    config.organizationId,
    parsed.data.issue
  )
  if (result.error !== null) return toolError(result.error)

  return toolSuccess(formatIssueEventList(result.data), {
    events: result.data.data,
  })
}

export async function handleLabelsList(
  client: ProjectsOperatorClient,
  config: Config,
  args: unknown
): Promise<ToolResult> {
  const parsed = labelsListSchema.safeParse(args ?? {})
  if (!parsed.success)
    return toolError({
      code: 'validation/invalid-arguments',
      message: parsed.error.issues
        .map((i) => `${i.path.join('.')}: ${i.message}`)
        .join(', '),
    })

  const result = await client.labels.list(config.organizationId)
  if (result.error !== null) return toolError(result.error)

  return toolSuccess(formatLabelList(result.data), {
    labels: result.data.data,
  })
}

export async function handleWorkItemTypesList(
  client: ProjectsOperatorClient,
  config: Config,
  args: unknown
): Promise<ToolResult> {
  const parsed = workItemTypesListSchema.safeParse(args ?? {})
  if (!parsed.success)
    return toolError({
      code: 'validation/invalid-arguments',
      message: parsed.error.issues
        .map((i) => `${i.path.join('.')}: ${i.message}`)
        .join(', '),
    })

  const result = await client.workItemTypes.list(config.organizationId)
  if (result.error !== null) return toolError(result.error)

  const activeTypes = result.data.data.filter(
    (type) => type.archivedAt === null
  )
  return toolSuccess(
    formatWorkItemTypeList({
      ...result.data,
      data: activeTypes,
    }),
    {
      workItemTypes: activeTypes,
    }
  )
}

export async function handleWorkflowStatesList(
  client: ProjectsOperatorClient,
  config: Config,
  args: unknown
): Promise<ToolResult> {
  const parsed = workflowStatesListSchema.safeParse(args ?? {})
  if (!parsed.success)
    return toolError({
      code: 'validation/invalid-arguments',
      message: parsed.error.issues
        .map((i) => `${i.path.join('.')}: ${i.message}`)
        .join(', '),
    })

  const result = await client.workflowStates.list(config.organizationId)
  if (result.error !== null) return toolError(result.error)

  const activeStates = result.data.data.filter(
    (state) => state.archivedAt === null
  )
  return toolSuccess(
    formatWorkflowStateList({
      ...result.data,
      data: activeStates,
    }),
    {
      workflowStates: activeStates,
    }
  )
}

export async function handleMilestonesList(
  client: ProjectsOperatorClient,
  config: Config,
  args: unknown
): Promise<ToolResult> {
  const parsed = milestonesListSchema.safeParse(args)
  if (!parsed.success)
    return toolError({
      code: 'validation/invalid-arguments',
      message: parsed.error.issues
        .map((i) => `${i.path.join('.')}: ${i.message}`)
        .join(', '),
    })

  const result = await client.milestones.list(
    config.organizationId,
    parsed.data.projectId,
    parsed.data.status !== undefined ? { status: parsed.data.status } : {}
  )
  if (result.error !== null) return toolError(result.error)

  return toolSuccess(formatMilestoneList(result.data), {
    milestones: result.data.data,
  })
}

export async function handleLabelCreate(
  client: ProjectsOperatorClient,
  config: Config,
  args: unknown
): Promise<ToolResult> {
  const parsed = labelCreateSchema.safeParse(args)
  if (!parsed.success)
    return toolError({
      code: 'validation/invalid-arguments',
      message: parsed.error.issues
        .map((i) => `${i.path.join('.')}: ${i.message}`)
        .join(', '),
    })

  const result = await client.labels.create(config.organizationId, {
    name: parsed.data.name,
    ...(parsed.data.color !== undefined ? { color: parsed.data.color } : {}),
    ...(parsed.data.description !== undefined
      ? { description: parsed.data.description }
      : {}),
  })
  if (result.error !== null) return toolError(result.error)

  return toolSuccess(formatLabel(result.data), {
    label: result.data,
  })
}
