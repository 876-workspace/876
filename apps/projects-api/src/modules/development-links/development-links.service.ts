import { getError, type ProjectsError } from '../../http/errors.js'
import { generateId } from '../../platform/ids.js'
import { nowUnixSeconds, toDbUnixSeconds } from '../../platform/timestamps.js'
import * as issues from '../issues/index.js'
import * as tenants from '../tenants/index.js'
import * as repository from './development-links.repository.js'
import type {
  CreateDevelopmentLinkBody,
  UpdateDevelopmentLinkBody,
} from './development-links.schemas.js'
import {
  serializeDevelopmentLink,
  type SerializedDevelopmentLink,
} from './development-links.serializers.js'

type ServiceResult<T> =
  { data: T; error: null } | { data: null; error: ProjectsError }

async function resolveTenant(organizationId: string) {
  const tenant = await tenants.resolveTenant(organizationId)
  if (!tenant)
    return { tenant: null, error: getError('projects/tenant-not-found') }
  return { tenant, error: null }
}

async function resolveIssue(organizationId: string, issueRef: string) {
  const result = await issues.retrieve(organizationId, issueRef)
  return result.error === null ? result.data : null
}

export async function list(
  organizationId: string,
  issueRef: string
): Promise<ServiceResult<SerializedDevelopmentLink[]>> {
  const resolved = await resolveTenant(organizationId)
  if (resolved.error !== null) return { data: null, error: resolved.error }
  const issue = await resolveIssue(organizationId, issueRef)
  if (!issue) return { data: null, error: getError('projects/issue-not-found') }
  const rows = await repository.list(resolved.tenant.id, issue.id)
  return { data: rows.map(serializeDevelopmentLink), error: null }
}

export async function create(
  organizationId: string,
  issueRef: string,
  body: CreateDevelopmentLinkBody
): Promise<ServiceResult<SerializedDevelopmentLink>> {
  const resolved = await resolveTenant(organizationId)
  if (resolved.error !== null) return { data: null, error: resolved.error }
  const issue = await resolveIssue(organizationId, issueRef)
  if (!issue) return { data: null, error: getError('projects/issue-not-found') }
  const now = toDbUnixSeconds(nowUnixSeconds())
  const row = await repository.upsert({
    id: generateId('developmentLink'),
    tenantId: resolved.tenant.id,
    workItemId: issue.id,
    kind: body.kind,
    url: body.url,
    label: body.label ?? null,
    externalId: body.externalId ?? body.url,
    state: body.state ?? null,
    createdAt: now,
    updatedAt: now,
  })
  return { data: serializeDevelopmentLink(row), error: null }
}

export async function update(
  organizationId: string,
  id: string,
  body: UpdateDevelopmentLinkBody
): Promise<ServiceResult<SerializedDevelopmentLink>> {
  const resolved = await resolveTenant(organizationId)
  if (resolved.error !== null) return { data: null, error: resolved.error }
  const existing = await repository.retrieve(resolved.tenant.id, id)
  if (!existing)
    return {
      data: null,
      error: getError('projects/development-link-not-found'),
    }
  const row = await repository.update(resolved.tenant.id, id, {
    ...(body.label !== undefined ? { label: body.label } : {}),
    ...(body.state !== undefined ? { state: body.state } : {}),
    updatedAt: toDbUnixSeconds(nowUnixSeconds()),
  })
  return { data: serializeDevelopmentLink(row), error: null }
}

export async function remove(
  organizationId: string,
  id: string
): Promise<
  ServiceResult<{ object: 'development-link'; id: string; deleted: true }>
> {
  const resolved = await resolveTenant(organizationId)
  if (resolved.error !== null) return { data: null, error: resolved.error }
  const existing = await repository.retrieve(resolved.tenant.id, id)
  if (!existing)
    return {
      data: null,
      error: getError('projects/development-link-not-found'),
    }
  await repository.hardDelete(resolved.tenant.id, id)
  return {
    data: { object: 'development-link', id, deleted: true },
    error: null,
  }
}
