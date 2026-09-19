import type {
  CreateIssueInput,
  CreateProjectInput,
  CreateTimeEntryInput,
  ListIssuesQuery,
  ListProjectsQuery,
  UpdateIssueInput,
  UpdateProjectInput,
} from '@876/projects/contracts'
import type { ProjectsOperatorClient } from '@876/projects/operator'
import {
  formatAgentBrief,
  type AgentBriefLink,
} from '@876/projects/agent-brief'

import { hasWriteScope, PROJECTS_WRITE_SCOPE, type Config } from './config'
import {
  formatActivityFeed,
  formatBudgetVarianceReport,
  formatComment,
  formatComments,
  formatCustomModuleList,
  formatCustomRecord,
  formatCustomRecordList,
  formatCycle,
  formatCycleList,
  formatHealthReport,
  formatIssue,
  formatIssueEventList,
  formatIssueList,
  formatLabel,
  formatLabelList,
  formatMilestoneList,
  formatPhase,
  formatPhaseList,
  formatProject,
  formatProjectList,
  formatProjectTemplate,
  formatProjectTemplateList,
  formatTaskListList,
  formatTimeEntry,
  formatTimeEntryList,
  formatTimeReport,
  formatTimeSummary,
  formatWikiPage,
  formatWorkloadReport,
  formatWorkReport,
  formatWorkflowStateList,
  formatWorkItemTypeList,
  formatWorkspace,
  toolError,
  toolSuccess,
  type ToolResult,
} from './format'
import {
  activityListSchema,
  customModulesListSchema,
  customRecordGetSchema,
  customRecordsListSchema,
  cycleGetSchema,
  cyclesListSchema,
  issueCommentSchema,
  issueCommentsSchema,
  issueCreateSchema,
  issueEventsSchema,
  issueGetSchema,
  issueBriefSchema,
  issueDevelopmentLinkSchema,
  issueDevelopmentLinksSchema,
  issuesListSchema,
  issueUpdateSchema,
  labelCreateSchema,
  captureCreateSchema,
  capturesListSchema,
  capturePromoteSchema,
  labelsListSchema,
  milestonesListSchema,
  phaseGetSchema,
  phasesListSchema,
  projectCreateSchema,
  projectGetSchema,
  projectsListSchema,
  projectUpdateSchema,
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

function writeScopeError(): ToolResult {
  return toolError({
    code: 'auth/insufficient-scope',
    message: `This tool requires the '${PROJECTS_WRITE_SCOPE}' scope.`,
  })
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
  if (!hasWriteScope(config)) return writeScopeError()
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
  if (!hasWriteScope(config)) return writeScopeError()
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

export async function handleIssueBrief(
  client: ProjectsOperatorClient,
  config: Config,
  args: unknown
): Promise<ToolResult> {
  const parsed = issueBriefSchema.safeParse(args)
  if (!parsed.success)
    return toolError({
      code: 'validation/invalid-arguments',
      message: parsed.error.issues
        .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
        .join(', '),
    })

  const issueResult = await client.issues.retrieve(
    config.organizationId,
    parsed.data.ref
  )
  if (issueResult.error !== null) return toolError(issueResult.error)

  const issue = issueResult.data
  const [
    commentsResult,
    subIssuesResult,
    relationsResult,
    parentResult,
    statesResult,
    developmentLinksResult,
  ] = await Promise.all([
    client.comments.list(config.organizationId, issue.id, { limit: 100 }),
    client.issues.list(config.organizationId, { parent: issue.id, limit: 100 }),
    client.issueRelations.list(config.organizationId, issue.id),
    issue.parentIssueId
      ? client.issues.retrieve(config.organizationId, issue.parentIssueId)
      : Promise.resolve(null),
    client.workflowStates.list(config.organizationId),
    client.developmentLinks.list(config.organizationId, issue.id),
  ])

  const notes: string[] = []
  if (commentsResult.error !== null) notes.push('Comments could not be loaded.')
  if (subIssuesResult.error !== null)
    notes.push('Sub-issues could not be loaded.')
  if (parentResult?.error !== null)
    notes.push('Parent issue could not be loaded.')
  if (statesResult.error !== null)
    notes.push('Workflow states could not be loaded.')
  if (developmentLinksResult.error !== null)
    notes.push('Development links could not be loaded.')

  let links: AgentBriefLink[] | undefined
  if (relationsResult.error !== null) {
    notes.push('Links could not be loaded.')
  } else {
    const linkedIssues = await Promise.all(
      relationsResult.data.data.map(async (relation) => {
        const issueId =
          relation.sourceIssueId === issue.id
            ? relation.targetIssueId
            : relation.sourceIssueId
        const linkedResult = await client.issues.retrieve(
          config.organizationId,
          issueId
        )
        return linkedResult.error === null
          ? {
              relation: relation.type.replaceAll('-', ' '),
              issue: linkedResult.data,
            }
          : null
      })
    )
    if (linkedIssues.some((linked) => linked === null))
      notes.push('Some linked issues could not be loaded.')
    links = linkedIssues.flatMap((linked) =>
      linked
        ? [
            {
              relation: linked.relation,
              identifier: linked.issue.identifier,
              title: linked.issue.title,
            },
          ]
        : []
    )
  }

  const brief = formatAgentBrief({
    issue,
    comments: commentsResult.data?.data,
    parentIssue: parentResult?.data,
    subIssues: subIssuesResult.data?.data,
    links,
    developmentLinks: developmentLinksResult.data?.data,
    doneStatusKeys: statesResult.data?.data
      .filter((state) => state.category === 'completed')
      .map((state) => state.key),
  })
  const completeBrief =
    notes.length > 0 ? `${brief}\n\n> Note: ${notes.join(' ')}` : brief

  return toolSuccess(completeBrief, { brief: completeBrief })
}

export async function handleIssueDevelopmentLink(
  client: ProjectsOperatorClient,
  config: Config,
  args: unknown
): Promise<ToolResult> {
  if (!hasWriteScope(config)) return writeScopeError()
  const parsed = issueDevelopmentLinkSchema.safeParse(args)
  if (!parsed.success)
    return toolError({
      code: 'validation/invalid-arguments',
      message: parsed.error.issues
        .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
        .join(', '),
    })
  const result = await client.developmentLinks.create(
    config.organizationId,
    parsed.data.ref,
    parsed.data
  )
  if (result.error !== null) return toolError(result.error)
  return toolSuccess(
    `${result.data.kind}: ${result.data.label ?? result.data.url}`,
    { developmentLink: result.data }
  )
}

export async function handleIssueDevelopmentLinks(
  client: ProjectsOperatorClient,
  config: Config,
  args: unknown
): Promise<ToolResult> {
  const parsed = issueDevelopmentLinksSchema.safeParse(args)
  if (!parsed.success)
    return toolError({
      code: 'validation/invalid-arguments',
      message: parsed.error.issues
        .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
        .join(', '),
    })
  const result = await client.developmentLinks.list(
    config.organizationId,
    parsed.data.ref
  )
  if (result.error !== null) return toolError(result.error)
  return toolSuccess(
    result.data.data
      .map((link) => `${link.kind}: ${link.label ?? link.url}`)
      .join('\n') || 'No development links.',
    { developmentLinks: result.data.data }
  )
}

export async function handleIssueCreate(
  client: ProjectsOperatorClient,
  config: Config,
  args: unknown
): Promise<ToolResult> {
  if (!hasWriteScope(config)) return writeScopeError()
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
  if (!hasWriteScope(config)) return writeScopeError()
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
  if (!hasWriteScope(config)) return writeScopeError()
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
  if (!hasWriteScope(config)) return writeScopeError()
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

export async function handleCaptureCreate(
  client: ProjectsOperatorClient,
  config: Config,
  args: unknown
): Promise<ToolResult> {
  if (!hasWriteScope(config)) return writeScopeError()
  const parsed = captureCreateSchema.safeParse(args)
  if (!parsed.success)
    return toolError({
      code: 'validation/invalid-arguments',
      message: parsed.error.issues
        .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
        .join(', '),
    })
  const project = parsed.data.projectKey
    ? await resolveProjectId(
        client,
        config.organizationId,
        parsed.data.projectKey
      )
    : null
  if (project?.error) return toolError(project.error)
  const result = await client.captures.create(config.organizationId, {
    title: parsed.data.title,
    ...(parsed.data.body !== undefined ? { body: parsed.data.body } : {}),
    ...(project?.id ? { projectId: project.id } : {}),
    source: 'mcp',
    createdBy: config.defaultUserId ?? 'mcp',
  })
  if (result.error !== null) return toolError(result.error)
  return toolSuccess(`${result.data.title}`, { capture: result.data })
}

export async function handleCapturesList(
  client: ProjectsOperatorClient,
  config: Config,
  args: unknown
): Promise<ToolResult> {
  const parsed = capturesListSchema.safeParse(args)
  if (!parsed.success)
    return toolError({
      code: 'validation/invalid-arguments',
      message: parsed.error.issues
        .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
        .join(', '),
    })
  const result = await client.captures.list(config.organizationId, {
    status: parsed.data.status ?? 'inbox',
  })
  if (result.error !== null) return toolError(result.error)
  return toolSuccess(
    result.data.data.map((capture) => capture.title).join('\n') ||
      '0 captures found.',
    { captures: result.data.data }
  )
}

export async function handleCapturePromote(
  client: ProjectsOperatorClient,
  config: Config,
  args: unknown
): Promise<ToolResult> {
  if (!hasWriteScope(config)) return writeScopeError()
  const parsed = capturePromoteSchema.safeParse(args)
  if (!parsed.success)
    return toolError({
      code: 'validation/invalid-arguments',
      message: parsed.error.issues
        .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
        .join(', '),
    })
  const project = await resolveProjectId(
    client,
    config.organizationId,
    parsed.data.projectKey
  )
  if (project.error) return toolError(project.error)
  const result = await client.captures.promote(
    config.organizationId,
    parsed.data.id,
    {
      projectId: project.id,
      ...(parsed.data.typeKey ? { typeKey: parsed.data.typeKey } : {}),
      ...(parsed.data.status ? { status: parsed.data.status } : {}),
      ...(config.defaultUserId ? { creatorUserId: config.defaultUserId } : {}),
    }
  )
  if (result.error !== null) return toolError(result.error)
  return toolSuccess(formatIssue(result.data), { issue: result.data })
}

export async function handlePhasesList(
  client: ProjectsOperatorClient,
  config: Config,
  args: unknown
): Promise<ToolResult> {
  const parsed = phasesListSchema.safeParse(args ?? {})
  if (!parsed.success)
    return toolError({
      code: 'validation/invalid-arguments',
      message: parsed.error.issues
        .map((i) => `${i.path.join('.')}: ${i.message}`)
        .join(', '),
    })

  const statusFilter =
    parsed.data.status !== undefined ? { status: parsed.data.status } : {}
  const result =
    parsed.data.projectId !== undefined
      ? await client.milestones.list(
          config.organizationId,
          parsed.data.projectId,
          statusFilter
        )
      : await client.milestones.listAll(config.organizationId, statusFilter)
  if (result.error !== null) return toolError(result.error)

  return toolSuccess(formatPhaseList(result.data.data), {
    phases: result.data.data,
  })
}

export async function handlePhaseGet(
  client: ProjectsOperatorClient,
  config: Config,
  args: unknown
): Promise<ToolResult> {
  const parsed = phaseGetSchema.safeParse(args)
  if (!parsed.success)
    return toolError({
      code: 'validation/invalid-arguments',
      message: parsed.error.issues
        .map((i) => `${i.path.join('.')}: ${i.message}`)
        .join(', '),
    })

  const result = await client.milestones.retrieve(
    config.organizationId,
    parsed.data.phase
  )
  if (result.error !== null) return toolError(result.error)

  return toolSuccess(formatPhase(result.data), {
    phase: result.data,
  })
}

export async function handleCyclesList(
  client: ProjectsOperatorClient,
  config: Config,
  args: unknown
): Promise<ToolResult> {
  const parsed = cyclesListSchema.safeParse(args ?? {})
  if (!parsed.success)
    return toolError({
      code: 'validation/invalid-arguments',
      message: parsed.error.issues
        .map((i) => `${i.path.join('.')}: ${i.message}`)
        .join(', '),
    })

  const result = await client.cycles.list(config.organizationId, {
    ...(parsed.data.projectId !== undefined
      ? { projectId: parsed.data.projectId }
      : {}),
    ...(parsed.data.status !== undefined ? { status: parsed.data.status } : {}),
  })
  if (result.error !== null) return toolError(result.error)

  return toolSuccess(formatCycleList(result.data.data), {
    cycles: result.data.data,
  })
}

export async function handleCycleGet(
  client: ProjectsOperatorClient,
  config: Config,
  args: unknown
): Promise<ToolResult> {
  const parsed = cycleGetSchema.safeParse(args)
  if (!parsed.success)
    return toolError({
      code: 'validation/invalid-arguments',
      message: parsed.error.issues
        .map((i) => `${i.path.join('.')}: ${i.message}`)
        .join(', '),
    })

  const result = await client.cycles.retrieve(
    config.organizationId,
    parsed.data.cycle
  )
  if (result.error !== null) return toolError(result.error)

  return toolSuccess(formatCycle(result.data), {
    cycle: result.data,
  })
}

export async function handleTaskListsList(
  client: ProjectsOperatorClient,
  config: Config,
  args: unknown
): Promise<ToolResult> {
  const parsed = taskListsListSchema.safeParse(args)
  if (!parsed.success)
    return toolError({
      code: 'validation/invalid-arguments',
      message: parsed.error.issues
        .map((i) => `${i.path.join('.')}: ${i.message}`)
        .join(', '),
    })

  const result = await client.taskLists.list(
    config.organizationId,
    parsed.data.projectId,
    {
      ...(parsed.data.includeArchived !== undefined
        ? { includeArchived: parsed.data.includeArchived }
        : {}),
    }
  )
  if (result.error !== null) return toolError(result.error)

  return toolSuccess(formatTaskListList(result.data.data), {
    taskLists: result.data.data,
  })
}

export async function handleTimeEntriesList(
  client: ProjectsOperatorClient,
  config: Config,
  args: unknown
): Promise<ToolResult> {
  const parsed = timeEntriesListSchema.safeParse(args ?? {})
  if (!parsed.success)
    return toolError({
      code: 'validation/invalid-arguments',
      message: parsed.error.issues
        .map((i) => `${i.path.join('.')}: ${i.message}`)
        .join(', '),
    })

  const result = await client.timeEntries.list(config.organizationId, {
    ...(parsed.data.userId !== undefined ? { userId: parsed.data.userId } : {}),
    ...(parsed.data.projectId !== undefined
      ? { projectId: parsed.data.projectId }
      : {}),
    ...(parsed.data.issueId !== undefined
      ? { issueId: parsed.data.issueId }
      : {}),
    ...(parsed.data.from !== undefined ? { from: parsed.data.from } : {}),
    ...(parsed.data.to !== undefined ? { to: parsed.data.to } : {}),
    ...(parsed.data.billable !== undefined
      ? { billable: parsed.data.billable }
      : {}),
    ...(parsed.data.approvalStatus !== undefined
      ? { approvalStatus: parsed.data.approvalStatus }
      : {}),
  })
  if (result.error !== null) return toolError(result.error)

  return toolSuccess(formatTimeEntryList(result.data.data), {
    timeEntries: result.data.data,
  })
}

export async function handleTimeSummary(
  client: ProjectsOperatorClient,
  config: Config,
  args: unknown
): Promise<ToolResult> {
  const parsed = timeSummaryQuerySchema.safeParse(args)
  if (!parsed.success)
    return toolError({
      code: 'validation/invalid-arguments',
      message: parsed.error.issues
        .map((i) => `${i.path.join('.')}: ${i.message}`)
        .join(', '),
    })

  const result = await client.timeEntries.summary(config.organizationId, {
    groupBy: parsed.data.groupBy,
    from: parsed.data.from,
    to: parsed.data.to,
    ...(parsed.data.userId !== undefined ? { userId: parsed.data.userId } : {}),
    ...(parsed.data.projectId !== undefined
      ? { projectId: parsed.data.projectId }
      : {}),
    ...(parsed.data.issueId !== undefined
      ? { issueId: parsed.data.issueId }
      : {}),
  })
  if (result.error !== null) return toolError(result.error)

  return toolSuccess(formatTimeSummary(result.data), {
    summary: result.data,
  })
}

export async function handleReportWork(
  client: ProjectsOperatorClient,
  config: Config,
  args: unknown
): Promise<ToolResult> {
  const parsed = reportWorkSchema.safeParse(args)
  if (!parsed.success)
    return toolError({
      code: 'validation/invalid-arguments',
      message: parsed.error.issues
        .map((i) => `${i.path.join('.')}: ${i.message}`)
        .join(', '),
    })

  const result = await client.reports.work(config.organizationId, {
    from: parsed.data.from,
    to: parsed.data.to,
    ...(parsed.data.projectId !== undefined
      ? { projectId: parsed.data.projectId }
      : {}),
  })
  if (result.error !== null) return toolError(result.error)

  return toolSuccess(formatWorkReport(result.data), {
    report: result.data,
  })
}

export async function handleReportHealth(
  client: ProjectsOperatorClient,
  config: Config,
  args: unknown
): Promise<ToolResult> {
  const parsed = reportHealthSchema.safeParse(args ?? {})
  if (!parsed.success)
    return toolError({
      code: 'validation/invalid-arguments',
      message: parsed.error.issues
        .map((i) => `${i.path.join('.')}: ${i.message}`)
        .join(', '),
    })

  const result = await client.reports.health(config.organizationId)
  if (result.error !== null) return toolError(result.error)

  return toolSuccess(formatHealthReport(result.data), {
    report: result.data,
  })
}

export async function handleReportTime(
  client: ProjectsOperatorClient,
  config: Config,
  args: unknown
): Promise<ToolResult> {
  const parsed = reportTimeSchema.safeParse(args)
  if (!parsed.success)
    return toolError({
      code: 'validation/invalid-arguments',
      message: parsed.error.issues
        .map((i) => `${i.path.join('.')}: ${i.message}`)
        .join(', '),
    })

  const result = await client.reports.time(config.organizationId, {
    groupBy: parsed.data.groupBy,
    from: parsed.data.from,
    to: parsed.data.to,
    ...(parsed.data.projectId !== undefined
      ? { projectId: parsed.data.projectId }
      : {}),
  })
  if (result.error !== null) return toolError(result.error)

  return toolSuccess(formatTimeReport(result.data), {
    report: result.data,
  })
}

export async function handleReportBudgetVariance(
  client: ProjectsOperatorClient,
  config: Config,
  args: unknown
): Promise<ToolResult> {
  const parsed = reportBudgetVarianceSchema.safeParse(args)
  if (!parsed.success)
    return toolError({
      code: 'validation/invalid-arguments',
      message: parsed.error.issues
        .map((i) => `${i.path.join('.')}: ${i.message}`)
        .join(', '),
    })

  const result = await client.reports.budgetVariance(config.organizationId, {
    from: parsed.data.from,
    to: parsed.data.to,
  })
  if (result.error !== null) return toolError(result.error)

  return toolSuccess(formatBudgetVarianceReport(result.data), {
    report: result.data,
  })
}

export async function handleReportWorkload(
  client: ProjectsOperatorClient,
  config: Config,
  args: unknown
): Promise<ToolResult> {
  const parsed = reportWorkloadSchema.safeParse(args)
  if (!parsed.success)
    return toolError({
      code: 'validation/invalid-arguments',
      message: parsed.error.issues
        .map((i) => `${i.path.join('.')}: ${i.message}`)
        .join(', '),
    })

  const result = await client.reports.workload(config.organizationId, {
    from: parsed.data.from,
    to: parsed.data.to,
    ...(parsed.data.projectId !== undefined
      ? { projectId: parsed.data.projectId }
      : {}),
  })
  if (result.error !== null) return toolError(result.error)

  return toolSuccess(formatWorkloadReport(result.data), {
    report: result.data,
  })
}

export async function handleTemplatesList(
  client: ProjectsOperatorClient,
  config: Config,
  args: unknown
): Promise<ToolResult> {
  const parsed = templatesListSchema.safeParse(args ?? {})
  if (!parsed.success)
    return toolError({
      code: 'validation/invalid-arguments',
      message: parsed.error.issues
        .map((i) => `${i.path.join('.')}: ${i.message}`)
        .join(', '),
    })

  const result = await client.projectTemplates.list(config.organizationId)
  if (result.error !== null) return toolError(result.error)

  return toolSuccess(formatProjectTemplateList(result.data.data), {
    templates: result.data.data,
  })
}

export async function handleTemplateGet(
  client: ProjectsOperatorClient,
  config: Config,
  args: unknown
): Promise<ToolResult> {
  const parsed = templateGetSchema.safeParse(args)
  if (!parsed.success)
    return toolError({
      code: 'validation/invalid-arguments',
      message: parsed.error.issues
        .map((i) => `${i.path.join('.')}: ${i.message}`)
        .join(', '),
    })

  const result = await client.projectTemplates.retrieve(
    config.organizationId,
    parsed.data.template
  )
  if (result.error !== null) return toolError(result.error)

  return toolSuccess(formatProjectTemplate(result.data), {
    template: result.data,
  })
}

export async function handleCustomModulesList(
  client: ProjectsOperatorClient,
  config: Config,
  args: unknown
): Promise<ToolResult> {
  const parsed = customModulesListSchema.safeParse(args ?? {})
  if (!parsed.success)
    return toolError({
      code: 'validation/invalid-arguments',
      message: parsed.error.issues
        .map((i) => `${i.path.join('.')}: ${i.message}`)
        .join(', '),
    })

  const result = await client.customModules.listModules(config.organizationId)
  if (result.error !== null) return toolError(result.error)

  return toolSuccess(formatCustomModuleList(result.data.data), {
    modules: result.data.data,
  })
}

export async function handleCustomRecordsList(
  client: ProjectsOperatorClient,
  config: Config,
  args: unknown
): Promise<ToolResult> {
  const parsed = customRecordsListSchema.safeParse(args)
  if (!parsed.success)
    return toolError({
      code: 'validation/invalid-arguments',
      message: parsed.error.issues
        .map((i) => `${i.path.join('.')}: ${i.message}`)
        .join(', '),
    })

  const result = await client.customModules.listRecords(
    config.organizationId,
    parsed.data.module,
    {
      ...(parsed.data.limit !== undefined ? { limit: parsed.data.limit } : {}),
      ...(parsed.data.startingAfter !== undefined
        ? { startingAfter: parsed.data.startingAfter }
        : {}),
      ...(parsed.data.endingBefore !== undefined
        ? { endingBefore: parsed.data.endingBefore }
        : {}),
      ...(parsed.data.status !== undefined
        ? { status: parsed.data.status }
        : {}),
      ...(parsed.data.projectId !== undefined
        ? { projectId: parsed.data.projectId }
        : {}),
      ...(parsed.data.q !== undefined ? { q: parsed.data.q } : {}),
      ...(parsed.data.fieldKey !== undefined
        ? { fieldKey: parsed.data.fieldKey }
        : {}),
      ...(parsed.data.fieldValue !== undefined
        ? { fieldValue: parsed.data.fieldValue }
        : {}),
    }
  )
  if (result.error !== null) return toolError(result.error)

  return toolSuccess(formatCustomRecordList(result.data.data), {
    records: result.data.data,
  })
}

export async function handleCustomRecordGet(
  client: ProjectsOperatorClient,
  config: Config,
  args: unknown
): Promise<ToolResult> {
  const parsed = customRecordGetSchema.safeParse(args)
  if (!parsed.success)
    return toolError({
      code: 'validation/invalid-arguments',
      message: parsed.error.issues
        .map((i) => `${i.path.join('.')}: ${i.message}`)
        .join(', '),
    })

  const result = await client.customModules.retrieveRecord(
    config.organizationId,
    parsed.data.module,
    parsed.data.record
  )
  if (result.error !== null) return toolError(result.error)

  return toolSuccess(formatCustomRecord(result.data), {
    record: result.data,
  })
}

export async function handleActivityList(
  client: ProjectsOperatorClient,
  config: Config,
  args: unknown
): Promise<ToolResult> {
  const parsed = activityListSchema.safeParse(args)
  if (!parsed.success)
    return toolError({
      code: 'validation/invalid-arguments',
      message: parsed.error.issues
        .map((i) => `${i.path.join('.')}: ${i.message}`)
        .join(', '),
    })

  const result = await client.activity.listProjectActivity(
    config.organizationId,
    parsed.data.projectId,
    {
      ...(parsed.data.limit !== undefined ? { limit: parsed.data.limit } : {}),
      ...(parsed.data.cursor !== undefined
        ? { cursor: parsed.data.cursor }
        : {}),
    }
  )
  if (result.error !== null) return toolError(result.error)

  return toolSuccess(formatActivityFeed(result.data), {
    items: result.data.items,
    nextCursor: result.data.nextCursor,
    hasMore: result.data.hasMore,
  })
}

export async function handleWikiPageGet(
  client: ProjectsOperatorClient,
  config: Config,
  args: unknown
): Promise<ToolResult> {
  const parsed = wikiPageGetSchema.safeParse(args)
  if (!parsed.success)
    return toolError({
      code: 'validation/invalid-arguments',
      message: parsed.error.issues
        .map((i) => `${i.path.join('.')}: ${i.message}`)
        .join(', '),
    })

  const result = await client.wiki.retrieve(
    config.organizationId,
    parsed.data.projectId,
    parsed.data.page
  )
  if (result.error !== null) return toolError(result.error)

  return toolSuccess(formatWikiPage(result.data), {
    page: result.data,
  })
}

export async function handleTimeEntryCreate(
  client: ProjectsOperatorClient,
  config: Config,
  args: unknown
): Promise<ToolResult> {
  if (!hasWriteScope(config)) return writeScopeError()

  const parsed = timeEntryCreateSchema.safeParse(args)
  if (!parsed.success)
    return toolError({
      code: 'validation/invalid-arguments',
      message: parsed.error.issues
        .map((i) => `${i.path.join('.')}: ${i.message}`)
        .join(', '),
    })

  const userId = parsed.data.userId ?? config.defaultUserId
  if (!userId)
    return toolError({
      code: 'projects/time-entry-user-required',
      message:
        'A user ID is required to log time so ownership remains enforceable. Pass userId or configure a default user.',
    })

  const input: CreateTimeEntryInput = {
    userId,
    projectId: parsed.data.projectId,
    ...(parsed.data.issueId !== undefined
      ? { issueId: parsed.data.issueId }
      : {}),
    ...(parsed.data.milestoneId !== undefined
      ? { milestoneId: parsed.data.milestoneId }
      : {}),
    ...(parsed.data.taskListId !== undefined
      ? { taskListId: parsed.data.taskListId }
      : {}),
    startedAt: parsed.data.startedAt,
    endedAt: parsed.data.endedAt,
    ...(parsed.data.durationMinutes !== undefined
      ? { durationMinutes: parsed.data.durationMinutes }
      : {}),
    ...(parsed.data.billable !== undefined
      ? { billable: parsed.data.billable }
      : {}),
    ...(parsed.data.note !== undefined ? { note: parsed.data.note } : {}),
    ...(config.defaultUserId ? { createdBy: config.defaultUserId } : {}),
  }

  const result = await client.timeEntries.create(config.organizationId, input)
  if (result.error !== null) return toolError(result.error)

  return toolSuccess(formatTimeEntry(result.data), {
    timeEntry: result.data,
  })
}
