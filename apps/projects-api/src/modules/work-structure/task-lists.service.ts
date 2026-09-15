import { getError, type ProjectsError } from '../../http/errors.js'
import { generateId } from '../../platform/ids.js'
import {
  nowUnixSeconds,
  nullableToDbUnixSeconds,
  toDbUnixSeconds,
} from '../../platform/timestamps.js'
import * as projects from '../projects/index.js'
import * as tenants from '../tenants/index.js'
import * as repository from './task-lists.repository.js'
import {
  serializeTaskList,
  type SerializedTaskList,
  type TaskListRow,
} from './task-lists.serializers.js'
import type {
  CreateTaskListBody,
  MoveIssuesBody,
  ReorderTaskListsBody,
  UpdateTaskListBody,
} from './task-lists.schemas.js'
import { serializeMilestone } from './work-structure.serializers.js'
import * as workStructureRepository from './work-structure.repository.js'

export type ServiceResult<T> =
  { data: T; error: null } | { data: null; error: ProjectsError }

function now() {
  return toDbUnixSeconds(nowUnixSeconds())
}

async function resolveTenant(organizationId: string) {
  const tenant = await tenants.resolveTenant(organizationId)
  return tenant
    ? { tenant, error: null as null }
    : { tenant: null, error: getError('projects/tenant-not-found') }
}

async function resolveProject(tenantId: string, projectId: string) {
  const project = await projects.resolveProject(tenantId, projectId)
  return project
    ? { project, error: null as null }
    : { project: null, error: getError('projects/project-not-found') }
}

async function withProgress(row: TaskListRow): Promise<SerializedTaskList> {
  const progress = await repository.taskListProgress(row.tenantId, row.id)
  return serializeTaskList(row, progress)
}

export async function resolveTaskListById(tenantId: string, id: string) {
  return repository.retrieveTaskList(tenantId, id)
}

export async function listTaskLists(
  organizationId: string,
  projectId: string,
  includeArchived: boolean
): Promise<ServiceResult<SerializedTaskList[]>> {
  const resolved = await resolveTenant(organizationId)
  if (resolved.error || !resolved.tenant)
    return { data: null, error: resolved.error }
  const project = await resolveProject(resolved.tenant.id, projectId)
  if (project.error || !project.project)
    return { data: null, error: project.error }
  const rows = await repository.listTaskLists(
    resolved.tenant.id,
    project.project.id,
    includeArchived
  )
  const items = await Promise.all(rows.map((row) => withProgress(row)))
  return { data: items, error: null }
}

export async function createTaskList(
  organizationId: string,
  projectId: string,
  body: CreateTaskListBody
): Promise<ServiceResult<SerializedTaskList>> {
  const resolved = await resolveTenant(organizationId)
  if (resolved.error || !resolved.tenant)
    return { data: null, error: resolved.error }
  const project = await resolveProject(resolved.tenant.id, projectId)
  if (project.error || !project.project)
    return { data: null, error: project.error }

  let milestoneId: string | null = null
  if (body.milestoneId !== undefined && body.milestoneId !== null) {
    const milestone = await workStructureRepository.retrieveMilestone(
      resolved.tenant.id,
      body.milestoneId
    )
    if (!milestone || milestone.projectId !== project.project.id)
      return { data: null, error: getError('projects/milestone-not-found') }
    milestoneId = milestone.id
  }

  const timestamp = now()
  const position =
    body.position ??
    (await repository.countProjectTaskLists(
      resolved.tenant.id,
      project.project.id
    ))
  const row = await repository.createTaskList({
    id: generateId('taskList'),
    tenantId: resolved.tenant.id,
    projectId: project.project.id,
    milestoneId,
    name: body.name,
    description: body.description ?? null,
    ownerUserId: body.ownerUserId ?? null,
    startDate: nullableToDbUnixSeconds(body.startDate),
    targetDate: nullableToDbUnixSeconds(body.targetDate),
    position,
    createdAt: timestamp,
    updatedAt: timestamp,
  })
  return { data: await withProgress(row), error: null }
}

export async function retrieveTaskList(
  organizationId: string,
  id: string
): Promise<ServiceResult<SerializedTaskList>> {
  const resolved = await resolveTenant(organizationId)
  if (resolved.error || !resolved.tenant)
    return { data: null, error: resolved.error }
  const row = await repository.retrieveTaskList(resolved.tenant.id, id)
  if (!row)
    return { data: null, error: getError('projects/task-list-not-found') }
  return { data: await withProgress(row), error: null }
}

export async function updateTaskList(
  organizationId: string,
  id: string,
  body: UpdateTaskListBody
): Promise<ServiceResult<SerializedTaskList>> {
  const resolved = await resolveTenant(organizationId)
  if (resolved.error || !resolved.tenant)
    return { data: null, error: resolved.error }
  const existing = await repository.retrieveTaskList(resolved.tenant.id, id)
  if (!existing)
    return { data: null, error: getError('projects/task-list-not-found') }

  let milestoneId: string | null | undefined
  if (body.milestoneId !== undefined) {
    if (body.milestoneId === null) {
      milestoneId = null
    } else {
      const milestone = await workStructureRepository.retrieveMilestone(
        resolved.tenant.id,
        body.milestoneId
      )
      if (!milestone || milestone.projectId !== existing.projectId)
        return { data: null, error: getError('projects/milestone-not-found') }
      milestoneId = milestone.id
    }
  }

  const timestamp = now()
  const row = await repository.updateTaskList(existing.id, {
    ...(body.name !== undefined ? { name: body.name } : {}),
    ...(body.description !== undefined
      ? { description: body.description }
      : {}),
    ...(milestoneId !== undefined ? { milestoneId } : {}),
    ...(body.ownerUserId !== undefined
      ? { ownerUserId: body.ownerUserId }
      : {}),
    ...(body.startDate !== undefined
      ? { startDate: nullableToDbUnixSeconds(body.startDate) }
      : {}),
    ...(body.targetDate !== undefined
      ? { targetDate: nullableToDbUnixSeconds(body.targetDate) }
      : {}),
    ...(body.position !== undefined ? { position: body.position } : {}),
    updatedAt: timestamp,
  })
  return { data: await withProgress(row), error: null }
}

export async function removeTaskList(
  organizationId: string,
  id: string
): Promise<ServiceResult<{ object: 'task-list'; id: string; deleted: true }>> {
  const resolved = await resolveTenant(organizationId)
  if (resolved.error || !resolved.tenant)
    return { data: null, error: resolved.error }
  const existing = await repository.retrieveTaskList(resolved.tenant.id, id)
  if (!existing)
    return { data: null, error: getError('projects/task-list-not-found') }
  await repository.softDeleteTaskList(existing.id, now())
  return {
    data: { object: 'task-list', id, deleted: true as const },
    error: null,
  }
}

export async function archiveTaskList(
  organizationId: string,
  id: string
): Promise<ServiceResult<SerializedTaskList>> {
  const resolved = await resolveTenant(organizationId)
  if (resolved.error || !resolved.tenant)
    return { data: null, error: resolved.error }
  const existing = await repository.retrieveTaskList(resolved.tenant.id, id)
  if (!existing)
    return { data: null, error: getError('projects/task-list-not-found') }
  const timestamp = now()
  const row = await repository.updateTaskList(existing.id, {
    archivedAt: timestamp,
    updatedAt: timestamp,
  })
  return { data: await withProgress(row), error: null }
}

export async function restoreTaskList(
  organizationId: string,
  id: string
): Promise<ServiceResult<SerializedTaskList>> {
  const resolved = await resolveTenant(organizationId)
  if (resolved.error || !resolved.tenant)
    return { data: null, error: resolved.error }
  const existing = await repository.retrieveTaskList(resolved.tenant.id, id)
  if (!existing)
    return { data: null, error: getError('projects/task-list-not-found') }
  const timestamp = now()
  const row = await repository.updateTaskList(existing.id, {
    archivedAt: null,
    updatedAt: timestamp,
  })
  return { data: await withProgress(row), error: null }
}

export async function reorderTaskLists(
  organizationId: string,
  projectId: string,
  body: ReorderTaskListsBody
): Promise<ServiceResult<SerializedTaskList[]>> {
  const resolved = await resolveTenant(organizationId)
  if (resolved.error || !resolved.tenant)
    return { data: null, error: resolved.error }
  const project = await resolveProject(resolved.tenant.id, projectId)
  if (project.error || !project.project)
    return { data: null, error: project.error }

  const unique = new Set(body.orderedIds)
  if (unique.size !== body.orderedIds.length)
    return { data: null, error: getError('projects/invalid-request') }

  const rows = await Promise.all(
    body.orderedIds.map((id) =>
      repository.retrieveTaskList(resolved.tenant.id, id)
    )
  )
  for (const row of rows) {
    if (!row || row.projectId !== project.project.id)
      return { data: null, error: getError('projects/task-list-not-found') }
  }

  const timestamp = now()
  for (let index = 0; index < body.orderedIds.length; index += 1) {
    const id = body.orderedIds[index]
    if (id) {
      await repository.updateTaskList(id, {
        position: index,
        updatedAt: timestamp,
      })
    }
  }

  const refreshed = await repository.listTaskLists(
    resolved.tenant.id,
    project.project.id,
    true
  )
  const items = await Promise.all(refreshed.map((row) => withProgress(row)))
  return { data: items, error: null }
}

export async function moveIssuesToTaskList(
  organizationId: string,
  id: string,
  body: MoveIssuesBody
): Promise<ServiceResult<SerializedTaskList>> {
  const resolved = await resolveTenant(organizationId)
  if (resolved.error || !resolved.tenant)
    return { data: null, error: resolved.error }
  const list = await repository.retrieveTaskList(resolved.tenant.id, id)
  if (!list)
    return { data: null, error: getError('projects/task-list-not-found') }

  const result = await repository.assignIssuesToTaskList(
    resolved.tenant.id,
    list,
    body.issueIds,
    body.actorUserId ?? null,
    now()
  )
  if (result.error) return { data: null, error: result.error }
  const refreshed = await repository.retrieveTaskList(resolved.tenant.id, id)
  if (!refreshed)
    return { data: null, error: getError('projects/task-list-not-found') }
  return { data: await withProgress(refreshed), error: null }
}

export type WorkBreakdownIssue = {
  id: string
  identifier: string
  title: string
  status: string
  taskListId: string | null
  milestoneId: string | null
  parentIssueId: string | null
  subIssueCount: number
}

export type WorkBreakdownTaskList = {
  taskList: SerializedTaskList
  issues: WorkBreakdownIssue[]
}

export type WorkBreakdownPhase = {
  milestone: ReturnType<typeof serializeMilestone>
  taskLists: WorkBreakdownTaskList[]
  unlistedIssues: WorkBreakdownIssue[]
}

export type WorkBreakdown = {
  object: 'work-breakdown'
  projectId: string
  phases: WorkBreakdownPhase[]
  unphasedTaskLists: WorkBreakdownTaskList[]
  unlistedIssues: WorkBreakdownIssue[]
}

export async function workBreakdown(
  organizationId: string,
  projectId: string
): Promise<ServiceResult<WorkBreakdown>> {
  const resolved = await resolveTenant(organizationId)
  if (resolved.error || !resolved.tenant)
    return { data: null, error: resolved.error }
  const project = await resolveProject(resolved.tenant.id, projectId)
  if (project.error || !project.project)
    return { data: null, error: project.error }

  const [milestones, taskListRows, issues] = await Promise.all([
    workStructureRepository.listMilestones(
      resolved.tenant.id,
      project.project.id
    ),
    repository.listTaskLists(resolved.tenant.id, project.project.id, true),
    repository.listProjectIssuesForBreakdown(
      resolved.tenant.id,
      project.project.id
    ),
  ])

  const childCounts = new Map<string, number>()
  for (const issue of issues) {
    if (issue.parentIssueId) {
      childCounts.set(
        issue.parentIssueId,
        (childCounts.get(issue.parentIssueId) ?? 0) + 1
      )
    }
  }

  const toBreakdownIssue = (issue: {
    id: string
    identifier: string
    title: string
    status: string
    taskListId: string | null
    milestoneId: string | null
    parentIssueId: string | null
  }): WorkBreakdownIssue => ({
    id: issue.id,
    identifier: issue.identifier,
    title: issue.title,
    status: issue.status,
    taskListId: issue.taskListId,
    milestoneId: issue.milestoneId,
    parentIssueId: issue.parentIssueId,
    subIssueCount: childCounts.get(issue.id) ?? 0,
  })

  const rootIssues = issues.filter((issue) => issue.parentIssueId === null)

  const taskListsWithProgress = await Promise.all(
    taskListRows.map((row) => withProgress(row))
  )
  const taskListById = new Map(
    taskListsWithProgress.map((item) => [item.id, item])
  )

  const issuesByTaskList = new Map<string, WorkBreakdownIssue[]>()
  for (const issue of rootIssues) {
    if (issue.taskListId) {
      const bucket = issuesByTaskList.get(issue.taskListId) ?? []
      bucket.push(toBreakdownIssue(issue))
      issuesByTaskList.set(issue.taskListId, bucket)
    }
  }

  const toTaskListNode = (row: TaskListRow): WorkBreakdownTaskList => {
    const serialized = taskListById.get(row.id)
    if (!serialized) throw new Error('Task list serialization missing.')
    return {
      taskList: serialized,
      issues: issuesByTaskList.get(row.id) ?? [],
    }
  }

  const phases: WorkBreakdownPhase[] = milestones.map((milestone) => {
    const lists = taskListRows.filter((row) => row.milestoneId === milestone.id)
    const unlisted = rootIssues
      .filter(
        (issue) =>
          issue.milestoneId === milestone.id && issue.taskListId === null
      )
      .map(toBreakdownIssue)
    return {
      milestone: serializeMilestone(milestone),
      taskLists: lists.map(toTaskListNode),
      unlistedIssues: unlisted,
    }
  })

  const unphasedTaskLists = taskListRows
    .filter((row) => row.milestoneId === null)
    .map(toTaskListNode)

  const unlistedIssues = rootIssues
    .filter((issue) => issue.taskListId === null && issue.milestoneId === null)
    .map(toBreakdownIssue)

  return {
    data: {
      object: 'work-breakdown',
      projectId: project.project.id,
      phases,
      unphasedTaskLists,
      unlistedIssues,
    },
    error: null,
  }
}
