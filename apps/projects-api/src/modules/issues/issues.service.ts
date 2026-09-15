import { getError, type ProjectsError } from '../../http/errors.js'
import { generateId } from '../../platform/ids.js'
import {
  nowUnixSeconds,
  nullableToDbUnixSeconds,
  toDbUnixSeconds,
} from '../../platform/timestamps.js'
import * as labels from '../labels/index.js'
import * as projects from '../projects/index.js'
import * as tenants from '../tenants/index.js'
import * as workStructure from '../work-structure/index.js'
import * as repository from './issues.repository.js'
import type {
  CreateIssueBody,
  ListIssuesQuery,
  UpdateIssueBody,
} from './issues.schemas.js'
import {
  serializeIssue,
  serializeIssueEvent,
  type IssueRow,
  type SerializedIssue,
  type SerializedIssueEvent,
  type SerializedIssueTombstone,
} from './issues.serializers.js'

export type ServiceResult<T> =
  { data: T; error: null } | { data: null; error: ProjectsError }

export type PaginatedIssues = {
  items: SerializedIssue[]
  hasMore: boolean
  totalCount: number | null
}

class IssueMutationError extends Error {
  constructor(readonly projectsError: ProjectsError) {
    super(projectsError.message)
  }
}

export async function resolveIssue(
  tenantId: string,
  issueRef: string
): Promise<IssueRow | null> {
  if (issueRef.startsWith('iss_'))
    return repository.retrieve(tenantId, issueRef)
  return repository.retrieveByIdentifier(tenantId, issueRef.toUpperCase())
}

async function resolveTenant(organizationId: string) {
  const tenant = await tenants.resolveTenant(organizationId)
  if (!tenant)
    return { tenant: null, error: getError('projects/tenant-not-found') }
  return { tenant, error: null }
}

async function resolveProject(
  tenant: { id: string; triageProjectId: string | null },
  projectIdOrKey?: string
) {
  const target = projectIdOrKey ?? tenant.triageProjectId
  if (!target)
    return { project: null, error: getError('projects/project-not-found') }

  const project = await projects.resolveProject(tenant.id, target)
  if (!project)
    return { project: null, error: getError('projects/project-not-found') }

  return { project, error: null }
}

async function resolveLabels(
  tenantId: string,
  labelInputs: string[]
): Promise<string[]> {
  const resolvedIds: string[] = []
  const seen = new Set<string>()

  for (const input of labelInputs) {
    const label = await labels.resolveLabel(tenantId, input)
    if (label && !seen.has(label.id)) {
      seen.add(label.id)
      resolvedIds.push(label.id)
    }
  }

  return resolvedIds
}

async function hasValidParentHierarchy(
  tenantId: string,
  parentIssueId: string | null,
  childHierarchyLevel: number
): Promise<boolean> {
  if (parentIssueId === null) return true
  const parent = await repository.retrieve(tenantId, parentIssueId)
  if (!parent || parent.deletedAt !== null) return false
  const parentType = await workStructure.resolveWorkItemTypeByKey(
    tenantId,
    parent.typeKey
  )
  return parentType !== null && childHierarchyLevel < parentType.hierarchyLevel
}

async function resolveCreateState(tenantId: string, status?: string) {
  return status
    ? workStructure.resolveWorkflowStateByKey(tenantId, status)
    : workStructure.resolveDefaultWorkflowState(tenantId)
}

async function resolveCreateType(
  tenantId: string,
  projectDefaultWorkItemTypeId: string | null | undefined,
  typeKey?: string
) {
  if (typeKey) return workStructure.resolveWorkItemTypeByKey(tenantId, typeKey)
  if (projectDefaultWorkItemTypeId)
    return workStructure.resolveWorkItemTypeById(
      tenantId,
      projectDefaultWorkItemTypeId
    )
  return workStructure.resolveDefaultWorkItemType(tenantId)
}

export async function list(
  organizationId: string,
  query: ListIssuesQuery
): Promise<ServiceResult<PaginatedIssues>> {
  const tenantResolution = await resolveTenant(organizationId)
  if (tenantResolution.error !== null)
    return { data: null, error: tenantResolution.error }
  const tenant = tenantResolution.tenant

  const limit = Math.min(Math.max(query.limit ?? 25, 1), 100)
  const order = query.order ?? 'updated'
  const includeDeleted = query.include_deleted === 'true'

  const status = query.status
    ? query.status
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean)
    : undefined
  const priority = query.priority
    ? query.priority
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean)
    : undefined
  const label = query.label
    ? (Array.isArray(query.label) ? query.label : [query.label])
        .flatMap((value) => value.split(','))
        .map((value) => value.trim())
        .filter(Boolean)
    : undefined

  const options: repository.ListIssuesOptions = {
    project: query.project,
    milestoneId: query.milestoneId,
    typeKey: query.typeKey,
    status,
    priority,
    assignee: query.assignee,
    label,
    parent: query.parent,
    q: query.q,
    updatedSince: query.updated_since,
    includeDeleted,
    order,
    limit,
    startingAfter: query.starting_after,
    endingBefore: query.ending_before,
  }

  const rows = await repository.list(tenant.id, options)
  const hasMore = rows.length > limit
  const pagedRows = hasMore ? rows.slice(0, limit) : rows
  const totalCount = await repository.count(tenant.id, {
    project: query.project,
    milestoneId: query.milestoneId,
    typeKey: query.typeKey,
    status,
    priority,
    assignee: query.assignee,
    label,
    parent: query.parent,
    q: query.q,
    updatedSince: query.updated_since,
    includeDeleted,
  })

  const issueIds = pagedRows.map((row) => row.id)
  const enrichmentMap = await repository.getBatchEnrichment(issueIds)
  const structures = await Promise.all(
    pagedRows.map((row) => workStructure.getIssueStructure(tenant.id, row))
  )
  const items = pagedRows.map((row, index) => {
    const details = enrichmentMap.get(row.id)
    return serializeIssue(row, {
      projectKey: row.project?.key,
      labels: details?.labels,
      commentCount: details?.commentCount ?? 0,
      subIssueCount: details?.subIssueCount ?? 0,
      ...structures[index],
    })
  })

  return {
    data: { items, hasMore, totalCount },
    error: null,
  }
}

export async function create(
  organizationId: string,
  body: CreateIssueBody
): Promise<ServiceResult<SerializedIssue>> {
  const tenantResolution = await resolveTenant(organizationId)
  if (tenantResolution.error !== null)
    return { data: null, error: tenantResolution.error }
  const tenant = tenantResolution.tenant

  const projectResolution = await resolveProject(tenant, body.projectId)
  if (projectResolution.error !== null)
    return { data: null, error: projectResolution.error }
  const targetProject = projectResolution.project

  let resolvedLabelIds: string[] = []
  if (body.labelIds && body.labelIds.length > 0)
    resolvedLabelIds = await resolveLabels(tenant.id, body.labelIds)

  const state = await resolveCreateState(tenant.id, body.status)
  if (!state)
    return { data: null, error: getError('projects/workflow-state-not-found') }
  const status = state.key

  const workItemType = await resolveCreateType(
    tenant.id,
    targetProject.defaultWorkItemTypeId,
    body.typeKey
  )
  if (!workItemType)
    return { data: null, error: getError('projects/work-item-type-not-found') }
  const typeKey = workItemType.key

  if (
    !(await hasValidParentHierarchy(
      tenant.id,
      body.parentIssueId ?? null,
      workItemType.hierarchyLevel
    ))
  )
    return { data: null, error: getError('projects/invalid-request') }

  const milestone = body.milestoneId
    ? await workStructure.resolveMilestoneById(tenant.id, body.milestoneId)
    : null
  if (
    body.milestoneId &&
    (!milestone || milestone.projectId !== targetProject.id)
  )
    return { data: null, error: getError('projects/milestone-not-found') }

  const taskList = body.taskListId
    ? await workStructure.resolveTaskListById(tenant.id, body.taskListId)
    : null
  if (body.taskListId && (!taskList || taskList.projectId !== targetProject.id))
    return { data: null, error: getError('projects/task-list-not-found') }

  const cycle = body.cycleId
    ? await workStructure.resolveCycleById(tenant.id, body.cycleId)
    : null
  if (
    body.cycleId &&
    (!cycle || (cycle.projectId && cycle.projectId !== targetProject.id))
  )
    return { data: null, error: getError('projects/cycle-not-found') }

  const customFieldValidation =
    await workStructure.validateIssueCustomFieldValues(
      tenant.id,
      workItemType.id,
      body.customFields ?? []
    )
  if (customFieldValidation.error)
    return { data: null, error: customFieldValidation.error }

  const priority = body.priority ?? 'none'
  const timestamp = toDbUnixSeconds(nowUnixSeconds())
  let startedAt: bigint | null = null
  let completedAt: bigint | null = null
  let canceledAt: bigint | null = null

  if (state.category === 'started') startedAt = timestamp
  else if (state.category === 'completed') completedAt = timestamp
  else if (state.category === 'canceled') canceledAt = timestamp

  const issueId = generateId('issue')
  let createdRow: IssueRow

  try {
    createdRow = await repository.transaction(async (tx) => {
      const allocation = await tx.allocateIssueNumber(targetProject.id)
      const identifier = `${allocation.key}-${allocation.number}`
      const issue = await tx.createIssue({
        id: issueId,
        tenantId: tenant.id,
        projectId: allocation.projectId,
        number: allocation.number,
        identifier,
        title: body.title,
        description: body.description ?? null,
        status,
        workflowStateId: state.id,
        typeKey,
        workItemTypeId: workItemType.id,
        milestoneId: milestone?.id ?? null,
        taskListId: taskList?.id ?? null,
        cycleId: cycle?.id ?? null,
        priority,
        assigneeUserId: body.assigneeUserId ?? null,
        creatorUserId: body.creatorUserId ?? null,
        parentIssueId: body.parentIssueId ?? null,
        estimate: body.estimate ?? null,
        dueDate: nullableToDbUnixSeconds(body.dueDate),
        position: body.position ?? 0,
        startedAt,
        completedAt,
        canceledAt,
        createdAt: timestamp,
        updatedAt: timestamp,
      })

      await tx.createEvent({
        id: generateId('issueEvent'),
        tenantId: tenant.id,
        issueId: issue.id,
        actorUserId: body.creatorUserId ?? null,
        type: 'created',
        fromValue: null,
        toValue: identifier,
        createdAt: timestamp,
      })

      if (resolvedLabelIds.length > 0)
        await tx.setLabels(issue.id, resolvedLabelIds)

      if (body.customFields && body.customFields.length > 0) {
        const customFields = await workStructure.setCustomFieldValuesForTenant(
          tenant.id,
          issue.id,
          body.customFields,
          body.creatorUserId,
          tx.transactionClient
        )
        if (customFields.error) throw new IssueMutationError(customFields.error)
      }

      return issue
    })
  } catch (error) {
    if (error instanceof IssueMutationError)
      return { data: null, error: error.projectsError }
    throw error
  }

  const enrichment = await repository.getBatchEnrichment([createdRow.id])
  const details = enrichment.get(createdRow.id)
  const structure = await workStructure.getIssueStructure(tenant.id, createdRow)

  return {
    data: serializeIssue(createdRow, {
      projectKey: targetProject.key,
      labels: details?.labels,
      commentCount: details?.commentCount ?? 0,
      subIssueCount: details?.subIssueCount ?? 0,
      ...structure,
    }),
    error: null,
  }
}

export async function retrieve(
  organizationId: string,
  issueRef: string
): Promise<ServiceResult<SerializedIssue>> {
  const tenantResolution = await resolveTenant(organizationId)
  if (tenantResolution.error !== null)
    return { data: null, error: tenantResolution.error }
  const tenant = tenantResolution.tenant

  const row = issueRef.startsWith('iss_')
    ? await repository.retrieve(tenant.id, issueRef)
    : await repository.retrieveByIdentifier(tenant.id, issueRef.toUpperCase())
  if (!row || row.deletedAt !== null)
    return { data: null, error: getError('projects/issue-not-found') }

  const enrichment = await repository.getBatchEnrichment([row.id])
  const details = enrichment.get(row.id)
  const structure = await workStructure.getIssueStructure(tenant.id, row)

  return {
    data: serializeIssue(row, {
      projectKey: row.project?.key,
      labels: details?.labels,
      commentCount: details?.commentCount ?? 0,
      subIssueCount: details?.subIssueCount ?? 0,
      ...structure,
    }),
    error: null,
  }
}

export async function update(
  organizationId: string,
  issueRef: string,
  body: UpdateIssueBody
): Promise<ServiceResult<SerializedIssue>> {
  const tenantResolution = await resolveTenant(organizationId)
  if (tenantResolution.error !== null)
    return { data: null, error: tenantResolution.error }
  const tenant = tenantResolution.tenant

  const existing = issueRef.startsWith('iss_')
    ? await repository.retrieve(tenant.id, issueRef)
    : await repository.retrieveByIdentifier(tenant.id, issueRef.toUpperCase())
  if (!existing || existing.deletedAt !== null)
    return { data: null, error: getError('projects/issue-not-found') }

  let newProjectId: string | undefined
  let targetProjectKey = existing.project?.key ?? ''
  if (body.projectId !== undefined) {
    const projectResolution = await resolveProject(tenant, body.projectId)
    if (projectResolution.error !== null)
      return { data: null, error: projectResolution.error }
    newProjectId = projectResolution.project.id
    targetProjectKey = projectResolution.project.key
  }

  let resolvedLabelIds: string[] | undefined
  if (body.labelIds !== undefined)
    resolvedLabelIds = await resolveLabels(tenant.id, body.labelIds)

  const targetProjectId = newProjectId ?? existing.projectId
  const targetStatus =
    body.status === undefined
      ? null
      : await workStructure.resolveWorkflowStateByKey(tenant.id, body.status)
  if (body.status !== undefined && !targetStatus)
    return { data: null, error: getError('projects/workflow-state-not-found') }

  const targetType =
    body.typeKey === undefined
      ? null
      : await workStructure.resolveWorkItemTypeByKey(tenant.id, body.typeKey)
  if (body.typeKey !== undefined && !targetType)
    return { data: null, error: getError('projects/work-item-type-not-found') }

  const effectiveType =
    targetType ??
    (await workStructure.resolveWorkItemTypeByKey(tenant.id, existing.typeKey))
  if (!effectiveType)
    return { data: null, error: getError('projects/work-item-type-not-found') }

  if (
    (body.parentIssueId !== undefined || body.typeKey !== undefined) &&
    !(await hasValidParentHierarchy(
      tenant.id,
      body.parentIssueId === undefined
        ? existing.parentIssueId
        : body.parentIssueId,
      effectiveType.hierarchyLevel
    ))
  )
    return { data: null, error: getError('projects/invalid-request') }

  const targetMilestone =
    body.milestoneId === undefined || body.milestoneId === null
      ? null
      : await workStructure.resolveMilestoneById(tenant.id, body.milestoneId)
  if (
    body.milestoneId !== undefined &&
    body.milestoneId !== null &&
    (!targetMilestone || targetMilestone.projectId !== targetProjectId)
  )
    return { data: null, error: getError('projects/milestone-not-found') }

  const targetTaskList =
    body.taskListId === undefined || body.taskListId === null
      ? null
      : await workStructure.resolveTaskListById(tenant.id, body.taskListId)
  if (
    body.taskListId !== undefined &&
    body.taskListId !== null &&
    (!targetTaskList || targetTaskList.projectId !== targetProjectId)
  )
    return { data: null, error: getError('projects/task-list-not-found') }

  const targetCycle =
    body.cycleId === undefined || body.cycleId === null
      ? null
      : await workStructure.resolveCycleById(tenant.id, body.cycleId)
  if (
    body.cycleId !== undefined &&
    body.cycleId !== null &&
    (!targetCycle ||
      (targetCycle.projectId && targetCycle.projectId !== targetProjectId))
  )
    return { data: null, error: getError('projects/cycle-not-found') }

  if (body.customFields !== undefined || body.typeKey !== undefined) {
    const validation = await workStructure.validateIssueCustomFieldValues(
      tenant.id,
      effectiveType.id,
      body.customFields ?? [],
      existing.id
    )
    if (validation.error) return { data: null, error: validation.error }
  }

  const timestamp = toDbUnixSeconds(nowUnixSeconds())
  let startedAt: bigint | null | undefined
  let completedAt: bigint | null | undefined
  let canceledAt: bigint | null | undefined

  if (
    body.status !== undefined &&
    body.status !== existing.status &&
    targetStatus
  ) {
    if (targetStatus.category === 'started') {
      if (existing.startedAt === null || existing.startedAt === undefined)
        startedAt = timestamp
    } else if (targetStatus.category === 'completed') {
      completedAt = timestamp
      canceledAt = null
    } else if (targetStatus.category === 'canceled') {
      canceledAt = timestamp
      completedAt = null
    } else {
      completedAt = null
      canceledAt = null
    }
  }

  const eventsToWrite: Array<{
    type: string
    fromValue: string | null
    toValue: string | null
  }> = []

  if (body.status !== undefined && body.status !== existing.status) {
    eventsToWrite.push({
      type: 'status-changed',
      fromValue: existing.status,
      toValue: body.status,
    })
    if (targetStatus?.category === 'completed') {
      eventsToWrite.push({
        type: 'closed',
        fromValue: existing.status,
        toValue: body.status,
      })
    }
    const existingState = await workStructure.resolveWorkflowStateByKey(
      tenant.id,
      existing.status
    )
    if (
      (existingState?.category === 'completed' ||
        existingState?.category === 'canceled') &&
      targetStatus?.category !== 'completed' &&
      targetStatus?.category !== 'canceled'
    ) {
      eventsToWrite.push({
        type: 'reopened',
        fromValue: existing.status,
        toValue: body.status,
      })
    }
  }

  if (body.priority !== undefined && body.priority !== existing.priority) {
    eventsToWrite.push({
      type: 'priority-changed',
      fromValue: existing.priority,
      toValue: body.priority,
    })
  }

  if (
    body.assigneeUserId !== undefined &&
    body.assigneeUserId !== existing.assigneeUserId
  ) {
    eventsToWrite.push(
      body.assigneeUserId === null
        ? {
            type: 'unassigned',
            fromValue: existing.assigneeUserId ?? null,
            toValue: null,
          }
        : {
            type: 'assigned',
            fromValue: existing.assigneeUserId ?? null,
            toValue: body.assigneeUserId,
          }
    )
  }

  if (newProjectId !== undefined && newProjectId !== existing.projectId) {
    eventsToWrite.push({
      type: 'project-changed',
      fromValue: existing.projectId,
      toValue: newProjectId,
    })
  }

  if (
    body.milestoneId !== undefined &&
    (existing.milestoneId ?? null) !== (targetMilestone?.id ?? null)
  ) {
    eventsToWrite.push({
      type: 'milestone-changed',
      fromValue: existing.milestoneId ?? null,
      toValue: targetMilestone?.id ?? null,
    })
  }

  if (
    body.taskListId !== undefined &&
    (existing.taskListId ?? null) !== (targetTaskList?.id ?? null)
  ) {
    eventsToWrite.push({
      type: 'task-list-changed',
      fromValue: existing.taskListId ?? null,
      toValue: targetTaskList?.id ?? null,
    })
  }

  if (
    body.cycleId !== undefined &&
    (existing.cycleId ?? null) !== (targetCycle?.id ?? null)
  ) {
    eventsToWrite.push({
      type: 'cycle-changed',
      fromValue: existing.cycleId ?? null,
      toValue: targetCycle?.id ?? null,
    })
  }

  if (resolvedLabelIds !== undefined) {
    const existingLabelIds = existing.labels
      ? existing.labels.map((issueLabel) => issueLabel.label.id)
      : []
    const currentSet = new Set(existingLabelIds)
    const nextSet = new Set(resolvedLabelIds)

    for (const id of resolvedLabelIds) {
      if (!currentSet.has(id))
        eventsToWrite.push({ type: 'labeled', fromValue: null, toValue: id })
    }
    for (const id of existingLabelIds) {
      if (!nextSet.has(id))
        eventsToWrite.push({ type: 'unlabeled', fromValue: id, toValue: null })
    }
  }

  const updateParams: repository.UpdateIssueParams = { updatedAt: timestamp }
  if (newProjectId !== undefined) updateParams.projectId = newProjectId
  if (body.title !== undefined) updateParams.title = body.title
  if (body.description !== undefined)
    updateParams.description = body.description
  if (body.status !== undefined) updateParams.status = body.status
  if (targetStatus) updateParams.workflowStateId = targetStatus.id
  if (body.typeKey !== undefined) {
    updateParams.typeKey = body.typeKey
    updateParams.workItemTypeId = targetType?.id ?? null
  }
  if (body.milestoneId !== undefined)
    updateParams.milestoneId = targetMilestone?.id ?? null
  if (body.taskListId !== undefined)
    updateParams.taskListId = targetTaskList?.id ?? null
  if (body.cycleId !== undefined) updateParams.cycleId = targetCycle?.id ?? null
  if (body.priority !== undefined) updateParams.priority = body.priority
  if (body.assigneeUserId !== undefined)
    updateParams.assigneeUserId = body.assigneeUserId
  if (body.creatorUserId !== undefined)
    updateParams.creatorUserId = body.creatorUserId
  if (body.parentIssueId !== undefined)
    updateParams.parentIssueId = body.parentIssueId
  if (body.estimate !== undefined) updateParams.estimate = body.estimate
  if (body.dueDate !== undefined)
    updateParams.dueDate = nullableToDbUnixSeconds(body.dueDate)
  if (body.position !== undefined) updateParams.position = body.position
  if (startedAt !== undefined) updateParams.startedAt = startedAt
  if (completedAt !== undefined) updateParams.completedAt = completedAt
  if (canceledAt !== undefined) updateParams.canceledAt = canceledAt

  let updatedRow: IssueRow
  try {
    updatedRow = await repository.transaction(async (tx) => {
      const issue = await tx.updateIssue(existing.id, updateParams)

      if (resolvedLabelIds !== undefined)
        await tx.setLabels(existing.id, resolvedLabelIds)

      for (const event of eventsToWrite) {
        await tx.createEvent({
          id: generateId('issueEvent'),
          tenantId: tenant.id,
          issueId: existing.id,
          actorUserId: body.actorUserId ?? null,
          type: event.type,
          fromValue: event.fromValue,
          toValue: event.toValue,
          createdAt: timestamp,
        })
      }

      if (body.customFields !== undefined) {
        const customFields = await workStructure.setCustomFieldValuesForTenant(
          tenant.id,
          issue.id,
          body.customFields,
          body.actorUserId,
          tx.transactionClient
        )
        if (customFields.error) throw new IssueMutationError(customFields.error)
      }

      if (body.typeKey !== undefined)
        await workStructure.pruneCustomFieldValuesForWorkItemType(
          tenant.id,
          issue.id,
          effectiveType.id,
          tx.transactionClient
        )

      return issue
    })
  } catch (error) {
    if (error instanceof IssueMutationError)
      return { data: null, error: error.projectsError }
    throw error
  }

  const enrichment = await repository.getBatchEnrichment([updatedRow.id])
  const details = enrichment.get(updatedRow.id)
  const structure = await workStructure.getIssueStructure(tenant.id, updatedRow)

  return {
    data: serializeIssue(updatedRow, {
      projectKey: targetProjectKey,
      labels: details?.labels,
      commentCount: details?.commentCount ?? 0,
      subIssueCount: details?.subIssueCount ?? 0,
      ...structure,
    }),
    error: null,
  }
}

export async function remove(
  organizationId: string,
  issueRef: string
): Promise<ServiceResult<SerializedIssueTombstone>> {
  const tenantResolution = await resolveTenant(organizationId)
  if (tenantResolution.error !== null)
    return { data: null, error: tenantResolution.error }
  const tenant = tenantResolution.tenant

  const existing = issueRef.startsWith('iss_')
    ? await repository.retrieve(tenant.id, issueRef)
    : await repository.retrieveByIdentifier(tenant.id, issueRef.toUpperCase())
  if (!existing || existing.deletedAt !== null)
    return { data: null, error: getError('projects/issue-not-found') }

  const hardDelete = process.env.DELETION_MODE === 'hard'
  if (hardDelete) await repository.hardDelete(tenant.id, existing.id)
  else {
    const timestamp = toDbUnixSeconds(nowUnixSeconds())
    await repository.softDelete(tenant.id, existing.id, timestamp)
  }

  return {
    data: { object: 'projects.issue', id: existing.id, deleted: true },
    error: null,
  }
}

export async function listEvents(
  organizationId: string,
  issueRef: string
): Promise<ServiceResult<SerializedIssueEvent[]>> {
  const tenantResolution = await resolveTenant(organizationId)
  if (tenantResolution.error !== null)
    return { data: null, error: tenantResolution.error }
  const tenant = tenantResolution.tenant

  const existing = issueRef.startsWith('iss_')
    ? await repository.retrieve(tenant.id, issueRef)
    : await repository.retrieveByIdentifier(tenant.id, issueRef.toUpperCase())
  if (!existing || existing.deletedAt !== null)
    return { data: null, error: getError('projects/issue-not-found') }

  const rows = await repository.listEvents(tenant.id, existing.id)
  return { data: rows.map(serializeIssueEvent), error: null }
}
