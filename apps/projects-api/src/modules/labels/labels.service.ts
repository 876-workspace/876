import { getError, type ProjectsError } from '../../http/errors.js'
import { generateId } from '../../platform/ids.js'
import { nowUnixSeconds, toDbUnixSeconds } from '../../platform/timestamps.js'
import * as tenants from '../tenants/index.js'
import * as repository from './labels.repository.js'
import type { CreateLabelBody, UpdateLabelBody } from './labels.schemas.js'
import {
  serializeLabel,
  type LabelRow,
  type SerializedLabel,
  type SerializedLabelTombstone,
} from './labels.serializers.js'

export type ServiceResult<T> =
  { data: T; error: null } | { data: null; error: ProjectsError }

const DEFAULT_LABEL_COLOR = '#6b7280'

/**
 * Resolves or creates a label row for another module by id or name.
 *
 * Sibling modules (such as issues) need label rows for tenant-scoped work
 * rather than serialized resources. This is the labels module's public way
 * to hand them over: a module owns its own tables, so nothing outside this
 * directory may reach for `labels.repository`.
 */
export async function resolveLabel(
  tenantId: string,
  labelIdOrName: string
): Promise<LabelRow> {
  if (labelIdOrName.startsWith('lbl_')) {
    const byId = await repository.retrieve(tenantId, labelIdOrName)
    if (byId) return byId
  }

  const byName = await repository.retrieveByName(tenantId, labelIdOrName)
  if (byName) return byName

  const now = toDbUnixSeconds(nowUnixSeconds())
  return repository.create({
    id: generateId('label'),
    tenantId,
    name: labelIdOrName,
    color: DEFAULT_LABEL_COLOR,
    description: null,
    createdAt: now,
    updatedAt: now,
  })
}

export const ensureLabel = resolveLabel

async function resolveTenant(organizationId: string) {
  const tenant = await tenants.resolveTenant(organizationId)
  if (!tenant) {
    return { tenant: null, error: getError('projects/tenant-not-found') }
  }
  return { tenant, error: null }
}

export async function list(
  organizationId: string
): Promise<ServiceResult<SerializedLabel[]>> {
  const resolved = await resolveTenant(organizationId)
  if (resolved.error !== null) return { data: null, error: resolved.error }
  const tenant = resolved.tenant

  const rows = await repository.list(tenant.id)
  return {
    data: rows.map(serializeLabel),
    error: null,
  }
}

export async function create(
  organizationId: string,
  body: CreateLabelBody
): Promise<ServiceResult<SerializedLabel>> {
  const resolved = await resolveTenant(organizationId)
  if (resolved.error !== null) return { data: null, error: resolved.error }
  const tenant = resolved.tenant

  const existing = await repository.retrieveByName(tenant.id, body.name)
  if (existing) {
    return { data: null, error: getError('projects/label-name-taken') }
  }

  const now = toDbUnixSeconds(nowUnixSeconds())
  const created = await repository.create({
    id: generateId('label'),
    tenantId: tenant.id,
    name: body.name,
    color: body.color ?? DEFAULT_LABEL_COLOR,
    description: body.description ?? null,
    createdAt: now,
    updatedAt: now,
  })

  return {
    data: serializeLabel(created),
    error: null,
  }
}

export async function retrieve(
  organizationId: string,
  labelId: string
): Promise<ServiceResult<SerializedLabel>> {
  const resolved = await resolveTenant(organizationId)
  if (resolved.error !== null) return { data: null, error: resolved.error }
  const tenant = resolved.tenant

  const row = await repository.retrieve(tenant.id, labelId)
  if (!row) {
    return { data: null, error: getError('projects/label-not-found') }
  }

  return {
    data: serializeLabel(row),
    error: null,
  }
}

export async function update(
  organizationId: string,
  labelId: string,
  body: UpdateLabelBody
): Promise<ServiceResult<SerializedLabel>> {
  const resolved = await resolveTenant(organizationId)
  if (resolved.error !== null) return { data: null, error: resolved.error }
  const tenant = resolved.tenant

  const existing = await repository.retrieve(tenant.id, labelId)
  if (!existing) {
    return { data: null, error: getError('projects/label-not-found') }
  }

  if (body.name !== undefined && body.name !== existing.name) {
    const colliding = await repository.retrieveByName(tenant.id, body.name)
    if (colliding && colliding.id !== labelId) {
      return { data: null, error: getError('projects/label-name-taken') }
    }
  }

  const now = toDbUnixSeconds(nowUnixSeconds())
  const updateParams: Parameters<typeof repository.update>[2] = {
    updatedAt: now,
  }
  if (body.name !== undefined) updateParams.name = body.name
  if (body.color !== undefined) updateParams.color = body.color
  if (body.description !== undefined)
    updateParams.description = body.description

  const updated = await repository.update(tenant.id, labelId, updateParams)
  return {
    data: serializeLabel(updated),
    error: null,
  }
}

export async function remove(
  organizationId: string,
  labelId: string
): Promise<ServiceResult<SerializedLabelTombstone>> {
  const resolved = await resolveTenant(organizationId)
  if (resolved.error !== null) return { data: null, error: resolved.error }
  const tenant = resolved.tenant

  const existing = await repository.retrieve(tenant.id, labelId)
  if (!existing) {
    return { data: null, error: getError('projects/label-not-found') }
  }

  await repository.hardDelete(tenant.id, labelId)
  return {
    data: {
      object: 'projects.label',
      id: labelId,
      deleted: true,
    },
    error: null,
  }
}
