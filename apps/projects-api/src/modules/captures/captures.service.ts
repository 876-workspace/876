import { getError, type ProjectsError } from '../../http/errors.js'
import { generateId } from '../../platform/ids.js'
import { nowUnixSeconds, toDbUnixSeconds } from '../../platform/timestamps.js'
import * as issues from '../issues/index.js'
import * as tenants from '../tenants/index.js'
import * as repository from './captures.repository.js'
import type {
  CreateCaptureBody,
  PromoteCaptureBody,
  UpdateCaptureBody,
} from './captures.schemas.js'
import {
  serializeCapture,
  type SerializedCapture,
} from './captures.serializers.js'

export type ServiceResult<T> =
  { data: T; error: null } | { data: null; error: ProjectsError }
async function resolveTenant(organizationId: string) {
  const tenant = await tenants.resolveTenant(organizationId)
  return tenant
    ? { tenant, error: null }
    : { tenant: null, error: getError('projects/tenant-not-found') }
}
export async function list(
  organizationId: string,
  status = 'inbox'
): Promise<ServiceResult<SerializedCapture[]>> {
  const resolved = await resolveTenant(organizationId)
  if (resolved.error) return { data: null, error: resolved.error }
  return {
    data: (await repository.list(resolved.tenant.id, status)).map(
      serializeCapture
    ),
    error: null,
  }
}
export async function create(
  organizationId: string,
  body: CreateCaptureBody
): Promise<ServiceResult<SerializedCapture>> {
  const resolved = await resolveTenant(organizationId)
  if (resolved.error) return { data: null, error: resolved.error }
  const now = toDbUnixSeconds(nowUnixSeconds())
  const row = await repository.create({
    id: generateId('capture'),
    tenantId: resolved.tenant.id,
    title: body.title,
    body: body.body ?? null,
    status: 'inbox',
    source: body.source ?? null,
    createdBy: body.createdBy,
    projectId: body.projectId ?? null,
    promotedIssueId: null,
    createdAt: now,
    updatedAt: now,
  })
  return { data: serializeCapture(row), error: null }
}
export async function update(
  organizationId: string,
  captureId: string,
  body: UpdateCaptureBody
): Promise<ServiceResult<SerializedCapture>> {
  const resolved = await resolveTenant(organizationId)
  if (resolved.error) return { data: null, error: resolved.error }
  const current = await repository.retrieve(resolved.tenant.id, captureId)
  if (!current)
    return { data: null, error: getError('projects/capture-not-found') }
  const row = await repository.update(resolved.tenant.id, captureId, {
    ...body,
    updatedAt: toDbUnixSeconds(nowUnixSeconds()),
  })
  return { data: serializeCapture(row), error: null }
}
export async function discard(
  organizationId: string,
  captureId: string
): Promise<ServiceResult<SerializedCapture>> {
  const resolved = await resolveTenant(organizationId)
  if (resolved.error) return { data: null, error: resolved.error }
  const current = await repository.retrieve(resolved.tenant.id, captureId)
  if (!current)
    return { data: null, error: getError('projects/capture-not-found') }
  const row = await repository.update(resolved.tenant.id, captureId, {
    status: 'discarded',
    updatedAt: toDbUnixSeconds(nowUnixSeconds()),
  })
  return { data: serializeCapture(row), error: null }
}
export async function promote(
  organizationId: string,
  captureId: string,
  body: PromoteCaptureBody
): Promise<ServiceResult<unknown>> {
  const resolved = await resolveTenant(organizationId)
  if (resolved.error) return { data: null, error: resolved.error }
  const capture = await repository.retrieve(resolved.tenant.id, captureId)
  if (!capture)
    return { data: null, error: getError('projects/capture-not-found') }
  if (capture.status === 'promoted')
    return { data: null, error: getError('projects/capture-already-promoted') }
  const issue = await issues.create(organizationId, {
    projectId: body.projectId,
    title: capture.title,
    description: capture.body,
    typeKey: body.typeKey,
    status: body.status,
    creatorUserId: body.creatorUserId ?? capture.createdBy,
  })
  if (issue.error) return issue
  await repository.update(resolved.tenant.id, captureId, {
    status: 'promoted',
    promotedIssueId: issue.data.id,
    updatedAt: toDbUnixSeconds(nowUnixSeconds()),
  })
  return issue
}
export async function remove(
  organizationId: string,
  captureId: string
): Promise<ServiceResult<{ object: 'capture'; id: string; deleted: true }>> {
  const resolved = await resolveTenant(organizationId)
  if (resolved.error) return { data: null, error: resolved.error }
  if (!(await repository.retrieve(resolved.tenant.id, captureId)))
    return { data: null, error: getError('projects/capture-not-found') }
  await repository.hardDelete(resolved.tenant.id, captureId)
  return {
    data: { object: 'capture', id: captureId, deleted: true },
    error: null,
  }
}
