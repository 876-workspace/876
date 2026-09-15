import { getError, type ProjectsError } from '../../http/errors.js'
import { generateId } from '../../platform/ids.js'
import {
  nowUnixSeconds,
  nullableToDbUnixSeconds,
  toDbUnixSeconds,
} from '../../platform/timestamps.js'
import * as projects from '../projects/index.js'
import * as tenants from '../tenants/index.js'
import * as repository from './cycles.repository.js'
import {
  deriveCycleStatus,
  serializeCycle,
  type CycleRow,
  type SerializedCycle,
} from './cycles.serializers.js'
import type {
  AssignCycleIssuesBody,
  CreateCycleBody,
  UpdateCycleBody,
} from './cycles.schemas.js'

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

async function withMetrics(row: CycleRow): Promise<SerializedCycle> {
  const [progress, throughput] = await Promise.all([
    repository.cycleProgress(row.tenantId, row.id),
    repository.cycleThroughput(row.tenantId, row.id, row.startsAt, row.endsAt),
  ])
  return serializeCycle(row, progress, throughput.completedInWindow)
}

export async function listCycles(
  organizationId: string,
  projectId?: string,
  status?: 'upcoming' | 'active' | 'completed'
): Promise<ServiceResult<SerializedCycle[]>> {
  const resolved = await resolveTenant(organizationId)
  if (resolved.error || !resolved.tenant)
    return { data: null, error: resolved.error }

  let scopedProjectId: string | undefined
  if (projectId) {
    const project = await projects.resolveProject(resolved.tenant.id, projectId)
    if (!project)
      return { data: null, error: getError('projects/project-not-found') }
    scopedProjectId = project.id
  }

  const rows = await repository.listCycles(resolved.tenant.id, scopedProjectId)
  const items = await Promise.all(rows.map((row) => withMetrics(row)))
  const filtered = status
    ? items.filter(
        (item) =>
          deriveCycleStatus({
            startsAt: item.startsAt,
            endsAt: item.endsAt,
            completedAt: item.completedAt,
          }) === status
      )
    : items
  return { data: filtered, error: null }
}

export async function createCycle(
  organizationId: string,
  body: CreateCycleBody
): Promise<ServiceResult<SerializedCycle>> {
  const resolved = await resolveTenant(organizationId)
  if (resolved.error || !resolved.tenant)
    return { data: null, error: resolved.error }

  if (body.endsAt <= body.startsAt)
    return { data: null, error: getError('projects/invalid-request') }

  let projectId: string | null = null
  if (body.projectId !== undefined && body.projectId !== null) {
    const project = await projects.resolveProject(
      resolved.tenant.id,
      body.projectId
    )
    if (!project)
      return { data: null, error: getError('projects/project-not-found') }
    projectId = project.id
  }

  let number = body.number
  if (number !== undefined) {
    const existing = await repository.retrieveCycleByNumber(
      resolved.tenant.id,
      number
    )
    if (existing)
      return { data: null, error: getError('projects/cycle-number-taken') }
  } else {
    number = (await repository.maxCycleNumber(resolved.tenant.id)) + 1
  }

  const timestamp = now()
  const row = await repository.createCycle({
    id: generateId('cycle'),
    tenantId: resolved.tenant.id,
    projectId,
    number,
    name: body.name,
    description: body.description ?? null,
    goal: body.goal ?? null,
    startsAt: toDbUnixSeconds(body.startsAt),
    endsAt: toDbUnixSeconds(body.endsAt),
    createdAt: timestamp,
    updatedAt: timestamp,
  })
  return { data: await withMetrics(row), error: null }
}

export async function retrieveCycle(
  organizationId: string,
  id: string
): Promise<ServiceResult<SerializedCycle>> {
  const resolved = await resolveTenant(organizationId)
  if (resolved.error || !resolved.tenant)
    return { data: null, error: resolved.error }
  const row = await repository.retrieveCycle(resolved.tenant.id, id)
  if (!row) return { data: null, error: getError('projects/cycle-not-found') }
  return { data: await withMetrics(row), error: null }
}

export async function updateCycle(
  organizationId: string,
  id: string,
  body: UpdateCycleBody
): Promise<ServiceResult<SerializedCycle>> {
  const resolved = await resolveTenant(organizationId)
  if (resolved.error || !resolved.tenant)
    return { data: null, error: resolved.error }
  const existing = await repository.retrieveCycle(resolved.tenant.id, id)
  if (!existing)
    return { data: null, error: getError('projects/cycle-not-found') }

  let projectId: string | null | undefined
  if (body.projectId !== undefined) {
    if (body.projectId === null) {
      projectId = null
    } else {
      const project = await projects.resolveProject(
        resolved.tenant.id,
        body.projectId
      )
      if (!project)
        return { data: null, error: getError('projects/project-not-found') }
      projectId = project.id
    }
  }

  const nextStartsAt = body.startsAt ?? Number(existing.startsAt)
  const nextEndsAt = body.endsAt ?? Number(existing.endsAt)
  if (nextEndsAt <= nextStartsAt)
    return { data: null, error: getError('projects/invalid-request') }

  const timestamp = now()
  const row = await repository.updateCycle(existing.id, {
    ...(projectId !== undefined ? { projectId } : {}),
    ...(body.name !== undefined ? { name: body.name } : {}),
    ...(body.description !== undefined
      ? { description: body.description }
      : {}),
    ...(body.goal !== undefined ? { goal: body.goal } : {}),
    ...(body.startsAt !== undefined
      ? { startsAt: toDbUnixSeconds(body.startsAt) }
      : {}),
    ...(body.endsAt !== undefined
      ? { endsAt: toDbUnixSeconds(body.endsAt) }
      : {}),
    ...(body.completedAt !== undefined
      ? { completedAt: nullableToDbUnixSeconds(body.completedAt) }
      : {}),
    updatedAt: timestamp,
  })
  return { data: await withMetrics(row), error: null }
}

export async function removeCycle(
  organizationId: string,
  id: string
): Promise<ServiceResult<{ object: 'cycle'; id: string; deleted: true }>> {
  const resolved = await resolveTenant(organizationId)
  if (resolved.error || !resolved.tenant)
    return { data: null, error: resolved.error }
  const existing = await repository.retrieveCycle(resolved.tenant.id, id)
  if (!existing)
    return { data: null, error: getError('projects/cycle-not-found') }
  await repository.softDeleteCycle(existing.id, now())
  return {
    data: { object: 'cycle', id, deleted: true as const },
    error: null,
  }
}

export async function assignIssues(
  organizationId: string,
  id: string,
  body: AssignCycleIssuesBody
): Promise<ServiceResult<SerializedCycle>> {
  const resolved = await resolveTenant(organizationId)
  if (resolved.error || !resolved.tenant)
    return { data: null, error: resolved.error }
  const cycle = await repository.retrieveCycle(resolved.tenant.id, id)
  if (!cycle) return { data: null, error: getError('projects/cycle-not-found') }
  const result = await repository.assignIssuesToCycle(
    resolved.tenant.id,
    cycle,
    body.issueIds,
    body.actorUserId ?? null,
    now()
  )
  if (result.error) return { data: null, error: result.error }
  const refreshed = await repository.retrieveCycle(resolved.tenant.id, id)
  if (!refreshed)
    return { data: null, error: getError('projects/cycle-not-found') }
  return { data: await withMetrics(refreshed), error: null }
}

export async function unassignIssue(
  organizationId: string,
  id: string,
  issueId: string,
  actorUserId?: string | null
): Promise<ServiceResult<SerializedCycle>> {
  const resolved = await resolveTenant(organizationId)
  if (resolved.error || !resolved.tenant)
    return { data: null, error: resolved.error }
  const cycle = await repository.retrieveCycle(resolved.tenant.id, id)
  if (!cycle) return { data: null, error: getError('projects/cycle-not-found') }
  const result = await repository.unassignIssueFromCycle(
    resolved.tenant.id,
    cycle.id,
    issueId,
    actorUserId ?? null,
    now()
  )
  if (result.error) return { data: null, error: result.error }
  const refreshed = await repository.retrieveCycle(resolved.tenant.id, id)
  if (!refreshed)
    return { data: null, error: getError('projects/cycle-not-found') }
  return { data: await withMetrics(refreshed), error: null }
}
