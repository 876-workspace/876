import { getError, type ProjectsError } from '../../http/errors.js'
import { generateId } from '../../platform/ids.js'
import { nowUnixSeconds, toDbUnixSeconds } from '../../platform/timestamps.js'
import * as tenants from '../tenants/index.js'
import * as workStructure from '../work-structure/index.js'
import * as issuesRepository from './issues.repository.js'
import * as repository from './issue-links.repository.js'
import type { DependencyWithPredecessor } from './issue-links.repository.js'
import type {
  CreateIssueDependencyBody,
  CreateIssueRelationBody,
  UpdateIssueDependencyBody,
} from './issue-links.schemas.js'
import {
  serializeIssueDependency,
  serializeIssueRelation,
  type IssueDependencyView,
  type ScheduleConstraint,
  type ScheduleSuggestion,
  type SerializedIssueDependency,
  type SerializedIssueRelation,
} from './issue-links.serializers.js'
import type { IssueRow } from './issues.serializers.js'

type ServiceResult<T> =
  { data: T; error: null } | { data: null; error: ProjectsError }

export type SerializedIssueRelationTombstone = {
  object: 'issue-relation'
  id: string
  deleted: true
}

export type SerializedIssueDependencyTombstone = {
  object: 'issue-dependency'
  id: string
  deleted: true
}

export type LinkSummary = {
  blocked: boolean
  relationCount: number
  dependencyCount: number
}

const DEPENDENCY_TRAVERSAL_LIMIT = 1000
const TERMINAL_STATUSES = new Set(['done', 'canceled'])

async function resolveTenant(organizationId: string) {
  const tenant = await tenants.resolveTenant(organizationId)
  if (!tenant)
    return { tenant: null, error: getError('projects/tenant-not-found') }
  return { tenant, error: null }
}

async function resolveAnchorIssue(
  tenantId: string,
  issueRef: string
): Promise<IssueRow | null> {
  const row = issueRef.startsWith('iss_')
    ? await issuesRepository.retrieve(tenantId, issueRef)
    : await issuesRepository.retrieveByIdentifier(
        tenantId,
        issueRef.toUpperCase()
      )
  if (!row || row.deletedAt !== null) return null
  return row
}

async function resolveLinkEndpoint(
  tenantId: string,
  id: string
): Promise<IssueRow | null> {
  const row = await issuesRepository.retrieve(tenantId, id)
  if (!row || row.deletedAt !== null) return null
  return row
}

export async function listRelations(
  organizationId: string,
  issueRef: string
): Promise<ServiceResult<SerializedIssueRelation[]>> {
  const resolved = await resolveTenant(organizationId)
  if (resolved.error || !resolved.tenant)
    return { data: null, error: resolved.error }
  const anchor = await resolveAnchorIssue(resolved.tenant.id, issueRef)
  if (!anchor)
    return { data: null, error: getError('projects/issue-not-found') }
  const rows = await repository.listRelations(resolved.tenant.id, anchor.id)
  return { data: rows.map(serializeIssueRelation), error: null }
}

export async function createRelation(
  organizationId: string,
  issueRef: string,
  body: CreateIssueRelationBody
): Promise<ServiceResult<SerializedIssueRelation>> {
  const resolved = await resolveTenant(organizationId)
  if (resolved.error || !resolved.tenant)
    return { data: null, error: resolved.error }
  const source = await resolveAnchorIssue(resolved.tenant.id, issueRef)
  if (!source)
    return { data: null, error: getError('projects/issue-not-found') }
  const target = await resolveLinkEndpoint(
    resolved.tenant.id,
    body.targetIssueId
  )
  if (!target)
    return { data: null, error: getError('projects/issue-not-found') }
  if (target.id === source.id)
    return { data: null, error: getError('projects/issue-self-link') }

  const duplicate =
    body.type === 'blocks'
      ? await repository.findRelationBetween(
          resolved.tenant.id,
          source.id,
          target.id,
          body.type
        )
      : await repository.findUnorderedRelation(
          resolved.tenant.id,
          source.id,
          target.id,
          body.type
        )
  if (duplicate)
    return { data: null, error: getError('projects/issue-relation-exists') }

  const [sourceIssueId, targetIssueId] =
    body.type === 'blocks' || source.id < target.id
      ? [source.id, target.id]
      : [target.id, source.id]
  const timestamp = toDbUnixSeconds(nowUnixSeconds())
  const row = await repository.createRelation({
    id: generateId('issueRelation'),
    tenantId: resolved.tenant.id,
    sourceIssueId,
    targetIssueId,
    type: body.type,
    createdBy: body.actorUserId ?? null,
    createdAt: timestamp,
  })
  return { data: serializeIssueRelation(row), error: null }
}

export async function removeRelation(
  organizationId: string,
  issueRef: string,
  id: string
): Promise<ServiceResult<SerializedIssueRelationTombstone>> {
  const resolved = await resolveTenant(organizationId)
  if (resolved.error || !resolved.tenant)
    return { data: null, error: resolved.error }
  const anchor = await resolveAnchorIssue(resolved.tenant.id, issueRef)
  if (!anchor)
    return { data: null, error: getError('projects/issue-not-found') }
  const link = await repository.findRelation(resolved.tenant.id, id)
  if (
    !link ||
    (link.sourceIssueId !== anchor.id && link.targetIssueId !== anchor.id)
  )
    return { data: null, error: getError('projects/issue-relation-not-found') }
  await repository.deleteRelation(link.id)
  return {
    data: { object: 'issue-relation', id: link.id, deleted: true as const },
    error: null,
  }
}

export async function listDependencies(
  organizationId: string,
  issueRef: string
): Promise<ServiceResult<IssueDependencyView>> {
  const resolved = await resolveTenant(organizationId)
  if (resolved.error || !resolved.tenant)
    return { data: null, error: resolved.error }
  const anchor = await resolveAnchorIssue(resolved.tenant.id, issueRef)
  if (!anchor)
    return { data: null, error: getError('projects/issue-not-found') }
  const [predecessors, successors] = await Promise.all([
    repository.listPredecessorLinks(resolved.tenant.id, anchor.id),
    repository.listSuccessorLinks(resolved.tenant.id, anchor.id),
  ])
  return {
    data: {
      predecessors: predecessors.map(serializeIssueDependency),
      successors: successors.map(serializeIssueDependency),
    },
    error: null,
  }
}

async function wouldCreateCycle(
  tenantId: string,
  predecessorIssueId: string,
  successorIssueId: string
): Promise<boolean> {
  if (predecessorIssueId === successorIssueId) return true
  const visited = new Set<string>([successorIssueId])
  let frontier: string[] = [successorIssueId]
  for (
    let depth = 0;
    depth < DEPENDENCY_TRAVERSAL_LIMIT && frontier.length > 0;
    depth += 1
  ) {
    const next = await repository.listSuccessorIds(tenantId, frontier)
    const unseen = next.filter((id) => !visited.has(id))
    if (unseen.includes(predecessorIssueId)) return true
    for (const id of unseen) visited.add(id)
    frontier = unseen
  }
  return false
}

export async function createDependency(
  organizationId: string,
  issueRef: string,
  body: CreateIssueDependencyBody
): Promise<ServiceResult<SerializedIssueDependency>> {
  const resolved = await resolveTenant(organizationId)
  if (resolved.error || !resolved.tenant)
    return { data: null, error: resolved.error }
  const anchor = await resolveAnchorIssue(resolved.tenant.id, issueRef)
  if (!anchor)
    return { data: null, error: getError('projects/issue-not-found') }
  const [predecessor, successor] = await Promise.all([
    resolveLinkEndpoint(resolved.tenant.id, body.predecessorIssueId),
    resolveLinkEndpoint(resolved.tenant.id, body.successorIssueId),
  ])
  if (!predecessor || !successor)
    return { data: null, error: getError('projects/issue-not-found') }
  if (predecessor.id === successor.id)
    return { data: null, error: getError('projects/issue-self-link') }
  if (anchor.id !== predecessor.id && anchor.id !== successor.id)
    return { data: null, error: getError('projects/invalid-request') }

  const duplicate = await repository.findDependencyBetween(
    resolved.tenant.id,
    predecessor.id,
    successor.id
  )
  if (duplicate)
    return { data: null, error: getError('projects/issue-dependency-exists') }

  if (await wouldCreateCycle(resolved.tenant.id, predecessor.id, successor.id))
    return { data: null, error: getError('projects/issue-dependency-cycle') }

  const timestamp = toDbUnixSeconds(nowUnixSeconds())
  const row = await repository.createDependency({
    id: generateId('issueDependency'),
    tenantId: resolved.tenant.id,
    predecessorIssueId: predecessor.id,
    successorIssueId: successor.id,
    type: body.type ?? 'finish-to-start',
    lagMinutes: body.lagMinutes ?? 0,
    createdBy: body.actorUserId ?? null,
    createdAt: timestamp,
  })
  return { data: serializeIssueDependency(row), error: null }
}

export async function updateDependency(
  organizationId: string,
  issueRef: string,
  id: string,
  body: UpdateIssueDependencyBody
): Promise<ServiceResult<SerializedIssueDependency>> {
  const resolved = await resolveTenant(organizationId)
  if (resolved.error || !resolved.tenant)
    return { data: null, error: resolved.error }
  const anchor = await resolveAnchorIssue(resolved.tenant.id, issueRef)
  if (!anchor)
    return { data: null, error: getError('projects/issue-not-found') }
  const link = await repository.findDependency(resolved.tenant.id, id)
  if (
    !link ||
    (link.predecessorIssueId !== anchor.id &&
      link.successorIssueId !== anchor.id)
  )
    return {
      data: null,
      error: getError('projects/issue-dependency-not-found'),
    }

  if (
    await wouldCreateCycle(
      resolved.tenant.id,
      link.predecessorIssueId,
      link.successorIssueId
    )
  )
    return { data: null, error: getError('projects/issue-dependency-cycle') }

  const row = await repository.updateDependency(link.id, {
    ...(body.type !== undefined ? { type: body.type } : {}),
    ...(body.lagMinutes !== undefined ? { lagMinutes: body.lagMinutes } : {}),
  })
  return { data: serializeIssueDependency(row), error: null }
}

export async function removeDependency(
  organizationId: string,
  issueRef: string,
  id: string
): Promise<ServiceResult<SerializedIssueDependencyTombstone>> {
  const resolved = await resolveTenant(organizationId)
  if (resolved.error || !resolved.tenant)
    return { data: null, error: resolved.error }
  const anchor = await resolveAnchorIssue(resolved.tenant.id, issueRef)
  if (!anchor)
    return { data: null, error: getError('projects/issue-not-found') }
  const link = await repository.findDependency(resolved.tenant.id, id)
  if (
    !link ||
    (link.predecessorIssueId !== anchor.id &&
      link.successorIssueId !== anchor.id)
  )
    return {
      data: null,
      error: getError('projects/issue-dependency-not-found'),
    }
  await repository.deleteDependency(link.id)
  return {
    data: { object: 'issue-dependency', id: link.id, deleted: true as const },
    error: null,
  }
}

type SuccessorPlan = {
  plannedStartDate?: bigint | number | null
  plannedFinishDate?: bigint | number | null
  plannedDurationMinutes?: number | null
}

function suggestionBound(
  link: DependencyWithPredecessor
): { kind: 'start' | 'finish'; bound: number } | null {
  const lagSeconds = link.lagMinutes * 60
  const predecessor = link.predecessor
  switch (link.type) {
    case 'finish-to-start':
      return predecessor.plannedFinishDate === null ||
        predecessor.plannedFinishDate === undefined
        ? null
        : {
            kind: 'start',
            bound: Number(predecessor.plannedFinishDate) + lagSeconds,
          }
    case 'start-to-start':
      return predecessor.plannedStartDate === null ||
        predecessor.plannedStartDate === undefined
        ? null
        : {
            kind: 'start',
            bound: Number(predecessor.plannedStartDate) + lagSeconds,
          }
    case 'finish-to-finish':
      return predecessor.plannedFinishDate === null ||
        predecessor.plannedFinishDate === undefined
        ? null
        : {
            kind: 'finish',
            bound: Number(predecessor.plannedFinishDate) + lagSeconds,
          }
    case 'start-to-finish':
      return predecessor.plannedStartDate === null ||
        predecessor.plannedStartDate === undefined
        ? null
        : {
            kind: 'finish',
            bound: Number(predecessor.plannedStartDate) + lagSeconds,
          }
    default:
      return null
  }
}

function toConstraint(link: DependencyWithPredecessor): ScheduleConstraint {
  return {
    issueId: link.predecessor.id,
    identifier: link.predecessor.identifier,
    type: link.type,
    lagMinutes: link.lagMinutes,
  }
}

function nullablePlanDate(
  value: bigint | number | null | undefined
): number | null {
  return value === null || value === undefined ? null : Number(value)
}

function computeScheduleSuggestion(
  successor: SuccessorPlan,
  links: DependencyWithPredecessor[]
): ScheduleSuggestion {
  const startBounds: Array<{
    bound: number
    link: DependencyWithPredecessor
  }> = []
  const finishBounds: Array<{
    bound: number
    link: DependencyWithPredecessor
  }> = []
  for (const link of links) {
    const computed = suggestionBound(link)
    if (!computed) continue
    if (computed.kind === 'start')
      startBounds.push({ bound: computed.bound, link })
    else finishBounds.push({ bound: computed.bound, link })
  }

  const plannedStart = nullablePlanDate(successor.plannedStartDate)
  const plannedFinish = nullablePlanDate(successor.plannedFinishDate)
  const durationSeconds =
    successor.plannedDurationMinutes === null ||
    successor.plannedDurationMinutes === undefined
      ? null
      : successor.plannedDurationMinutes * 60

  if (durationSeconds !== null) {
    const effective = [
      ...startBounds,
      ...finishBounds.map((entry) => ({
        bound: entry.bound - durationSeconds,
        link: entry.link,
      })),
    ]
    const maximum =
      effective.length > 0
        ? Math.max(...effective.map((entry) => entry.bound))
        : null
    const earliestStart = maximum ?? plannedStart
    return {
      earliestStart,
      earliestFinish:
        earliestStart === null ? null : earliestStart + durationSeconds,
      constrainedBy:
        maximum === null
          ? []
          : effective
              .filter((entry) => entry.bound === maximum)
              .map((entry) => toConstraint(entry.link)),
    }
  }

  const maximumStart =
    startBounds.length > 0
      ? Math.max(...startBounds.map((entry) => entry.bound))
      : null
  const maximumFinish =
    finishBounds.length > 0
      ? Math.max(...finishBounds.map((entry) => entry.bound))
      : null
  return {
    earliestStart: maximumStart ?? plannedStart,
    earliestFinish: maximumFinish ?? plannedFinish,
    constrainedBy: [
      ...(maximumStart === null
        ? []
        : startBounds
            .filter((entry) => entry.bound === maximumStart)
            .map((entry) => toConstraint(entry.link))),
      ...(maximumFinish === null
        ? []
        : finishBounds
            .filter((entry) => entry.bound === maximumFinish)
            .map((entry) => toConstraint(entry.link))),
    ],
  }
}

export async function suggestSchedule(
  organizationId: string,
  issueRef: string
): Promise<ServiceResult<ScheduleSuggestion>> {
  const resolved = await resolveTenant(organizationId)
  if (resolved.error || !resolved.tenant)
    return { data: null, error: resolved.error }
  const successor = await resolveAnchorIssue(resolved.tenant.id, issueRef)
  if (!successor)
    return { data: null, error: getError('projects/issue-not-found') }
  const links = await repository.listSuccessorDependencies(
    resolved.tenant.id,
    successor.id
  )
  return { data: computeScheduleSuggestion(successor, links), error: null }
}

export async function summarizeLinks(
  tenantId: string,
  issueIds: string[]
): Promise<Map<string, LinkSummary>> {
  const summaries = new Map<string, LinkSummary>(
    issueIds.map((id) => [
      id,
      { blocked: false, relationCount: 0, dependencyCount: 0 },
    ])
  )
  if (issueIds.length === 0) return summaries

  const [relations, dependencies] = await Promise.all([
    repository.listRelationsForIssues(tenantId, issueIds),
    repository.listDependenciesForIssues(tenantId, issueIds),
  ])

  for (const relation of relations) {
    for (const id of [relation.sourceIssueId, relation.targetIssueId]) {
      const summary = summaries.get(id)
      if (summary) summary.relationCount += 1
    }
  }
  for (const dependency of dependencies) {
    for (const id of [
      dependency.predecessorIssueId,
      dependency.successorIssueId,
    ]) {
      const summary = summaries.get(id)
      if (summary) summary.dependencyCount += 1
    }
  }

  const blockerIds = new Set<string>()
  for (const relation of relations) {
    if (relation.type === 'blocks' && summaries.has(relation.targetIssueId))
      blockerIds.add(relation.sourceIssueId)
  }
  const predecessorIds = new Set<string>()
  for (const dependency of dependencies) {
    if (summaries.has(dependency.successorIssueId))
      predecessorIds.add(dependency.predecessorIssueId)
  }
  const statuses = await repository.listIssueStatuses(tenantId, [
    ...blockerIds,
    ...predecessorIds,
  ])

  const terminalCache = new Map<string, boolean>()
  const isTerminal = async (status: string): Promise<boolean> => {
    const cached = terminalCache.get(status)
    if (cached !== undefined) return cached
    let terminal = TERMINAL_STATUSES.has(status)
    if (!terminal) {
      const state = await workStructure.resolveWorkflowStateByKey(
        tenantId,
        status
      )
      terminal =
        state?.category === 'completed' || state?.category === 'canceled'
    }
    terminalCache.set(status, terminal)
    return terminal
  }

  for (const relation of relations) {
    if (relation.type !== 'blocks') continue
    const summary = summaries.get(relation.targetIssueId)
    if (!summary) continue
    const status = statuses.get(relation.sourceIssueId)
    if (status === undefined) continue
    if (!(await isTerminal(status))) summary.blocked = true
  }
  for (const dependency of dependencies) {
    const summary = summaries.get(dependency.successorIssueId)
    if (!summary) continue
    const status = statuses.get(dependency.predecessorIssueId)
    if (status === undefined) continue
    if (!(await isTerminal(status))) summary.blocked = true
  }

  return summaries
}
