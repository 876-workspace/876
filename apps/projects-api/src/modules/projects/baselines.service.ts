import { getError, type ProjectsError } from '../../http/errors.js'
import { generateId } from '../../platform/ids.js'
import {
  nowUnixSeconds,
  nullableFromDbUnixSeconds,
  nullableToDbUnixSeconds,
  toDbUnixSeconds,
} from '../../platform/timestamps.js'
import * as tenants from '../tenants/index.js'
import * as repository from './baselines.repository.js'
import {
  serializeBaseline,
  serializeBaselineDetail,
  varianceMinutes,
  type SerializedBaseline,
  type SerializedBaselineComparison,
  type SerializedBaselineDetail,
  type SerializedBaselineTombstone,
} from './baselines.serializers.js'
import { issuePlannedFinish, issuePlannedStart } from './gantt.serializers.js'
import * as ganttRepository from './gantt.repository.js'
import { resolveProject } from './projects.service.js'
import type { CreateBaselineBody } from './baselines.schemas.js'

export type ServiceResult<T> =
  { data: T; error: null } | { data: null; error: ProjectsError }

async function resolveTenant(organizationId: string) {
  const tenant = await tenants.resolveTenant(organizationId)
  if (!tenant)
    return { tenant: null, error: getError('projects/tenant-not-found') }
  return { tenant, error: null }
}

export async function listBaselines(
  organizationId: string,
  projectIdOrKey: string
): Promise<ServiceResult<SerializedBaseline[]>> {
  const resolved = await resolveTenant(organizationId)
  if (resolved.error || !resolved.tenant)
    return { data: null, error: resolved.error }
  const project = await resolveProject(resolved.tenant.id, projectIdOrKey)
  if (!project)
    return { data: null, error: getError('projects/project-not-found') }
  const rows = await repository.listBaselines(resolved.tenant.id, project.id)
  const counts = await repository.countBaselineItemsMany(
    resolved.tenant.id,
    rows.map((row) => row.id)
  )
  return {
    data: rows.map((row) => serializeBaseline(row, counts.get(row.id) ?? 0)),
    error: null,
  }
}

export async function createBaseline(
  organizationId: string,
  projectIdOrKey: string,
  body: CreateBaselineBody
): Promise<ServiceResult<SerializedBaselineDetail>> {
  const resolved = await resolveTenant(organizationId)
  if (resolved.error || !resolved.tenant)
    return { data: null, error: resolved.error }
  const project = await resolveProject(resolved.tenant.id, projectIdOrKey)
  if (!project)
    return { data: null, error: getError('projects/project-not-found') }

  const capturedAt = toDbUnixSeconds(nowUnixSeconds())
  const baselineId = generateId('projectBaseline')
  const row = await repository.createBaseline({
    id: baselineId,
    tenantId: resolved.tenant.id,
    projectId: project.id,
    name: body.name,
    capturedBy: body.capturedBy ?? null,
    capturedAt,
    note: body.note ?? null,
  })

  const issues = await ganttRepository.listGanttIssues(
    resolved.tenant.id,
    project.id
  )
  const snapshotIssues = issues.filter(
    (issue) =>
      issue.plannedStartDate !== null ||
      issue.plannedFinishDate !== null ||
      issue.plannedDurationMinutes !== null
  )
  const items = snapshotIssues.map((issue) => ({
    id: generateId('projectBaselineItem'),
    tenantId: resolved.tenant.id as string,
    baselineId,
    issueId: issue.id,
    plannedStartDate: nullableToDbUnixSeconds(issuePlannedStart(issue)),
    plannedFinishDate: nullableToDbUnixSeconds(issuePlannedFinish(issue)),
    plannedDurationMinutes: issue.plannedDurationMinutes,
    status: issue.status,
  }))
  await repository.createBaselineItems(items)

  const storedItems = await repository.listBaselineItems(
    resolved.tenant.id,
    baselineId
  )
  return { data: serializeBaselineDetail(row, storedItems), error: null }
}

export async function retrieveBaseline(
  organizationId: string,
  baselineId: string
): Promise<ServiceResult<SerializedBaselineDetail>> {
  const resolved = await resolveTenant(organizationId)
  if (resolved.error || !resolved.tenant)
    return { data: null, error: resolved.error }
  const row = await repository.retrieveBaseline(resolved.tenant.id, baselineId)
  if (!row)
    return { data: null, error: getError('projects/baseline-not-found') }
  const items = await repository.listBaselineItems(
    resolved.tenant.id,
    baselineId
  )
  return { data: serializeBaselineDetail(row, items), error: null }
}

export async function removeBaseline(
  organizationId: string,
  baselineId: string
): Promise<ServiceResult<SerializedBaselineTombstone>> {
  const resolved = await resolveTenant(organizationId)
  if (resolved.error || !resolved.tenant)
    return { data: null, error: resolved.error }
  const row = await repository.retrieveBaseline(resolved.tenant.id, baselineId)
  if (!row)
    return { data: null, error: getError('projects/baseline-not-found') }
  await repository.deleteBaseline(resolved.tenant.id, baselineId)
  return {
    data: { object: 'projects.baseline', id: baselineId, deleted: true },
    error: null,
  }
}

export async function compareBaseline(
  organizationId: string,
  projectIdOrKey: string,
  baselineId: string
): Promise<ServiceResult<SerializedBaselineComparison>> {
  const resolved = await resolveTenant(organizationId)
  if (resolved.error || !resolved.tenant)
    return { data: null, error: resolved.error }
  const project = await resolveProject(resolved.tenant.id, projectIdOrKey)
  if (!project)
    return { data: null, error: getError('projects/project-not-found') }
  const baseline = await repository.retrieveBaseline(
    resolved.tenant.id,
    baselineId
  )
  if (!baseline || baseline.projectId !== project.id)
    return { data: null, error: getError('projects/baseline-not-found') }

  const [storedItems, currentIssues] = await Promise.all([
    repository.listBaselineItems(resolved.tenant.id, baselineId),
    ganttRepository.listGanttIssues(resolved.tenant.id, project.id),
  ])
  const currentById = new Map(currentIssues.map((issue) => [issue.id, issue]))

  const items = storedItems.map((stored) => {
    const current = currentById.get(stored.issueId)
    const baselineStart = nullableFromDbUnixSeconds(stored.plannedStartDate)
    const baselineFinish = nullableFromDbUnixSeconds(stored.plannedFinishDate)
    const currentStart = current
      ? nullableFromDbUnixSeconds(current.plannedStartDate)
      : null
    const currentFinish = current
      ? nullableFromDbUnixSeconds(current.plannedFinishDate)
      : null
    return {
      object: 'baseline-comparison-item' as const,
      issueId: stored.issueId,
      identifier: current?.identifier ?? stored.issueId,
      baselineStart,
      baselineFinish,
      currentStart,
      currentFinish,
      startVarianceMinutes: varianceMinutes(baselineStart, currentStart),
      finishVarianceMinutes: varianceMinutes(baselineFinish, currentFinish),
    }
  })

  items.sort((a, b) =>
    a.identifier < b.identifier ? -1 : a.identifier > b.identifier ? 1 : 0
  )

  return {
    data: {
      object: 'baseline-comparison',
      baselineId: baseline.id,
      projectId: project.id,
      items,
    },
    error: null,
  }
}
