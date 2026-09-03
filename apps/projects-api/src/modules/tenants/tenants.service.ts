import { getError, type ProjectsError } from '../../http/errors.js'
import { generateId } from '../../platform/ids.js'
import { nowUnixSeconds, toDbUnixSeconds } from '../../platform/timestamps.js'
import * as repository from './tenants.repository.js'
import type { TenantRow } from './tenants.serializers.js'
import { serializeTenant } from './tenants.serializers.js'
import type { TenantSerialized } from './tenants.schemas.js'

export type ServiceResult<T> =
  { data: T; error: null } | { data: null; error: ProjectsError }

/**
 * Resolves an organization's tenant row for another module.
 *
 * Sibling modules scope every query by `tenantId`, so they need the row rather
 * than the serialized resource. This is the tenants module's public way to hand
 * it over: a module owns its own tables, so nothing outside this directory may
 * reach for `tenants.repository`.
 */
export async function resolveTenant(
  organizationId: string
): Promise<TenantRow | null> {
  return repository.retrieveByOrganization(organizationId)
}

export async function retrieveByOrganization(
  organizationId: string
): Promise<ServiceResult<TenantSerialized>> {
  const row = await repository.retrieveByOrganization(organizationId)
  if (!row) {
    return {
      data: null,
      error: getError('projects/tenant-not-found'),
    }
  }

  return {
    data: serializeTenant(row),
    error: null,
  }
}

export type EnsureResult =
  | { data: TenantSerialized; isNew: boolean; error: null }
  | { data: null; isNew: false; error: ProjectsError }

export async function ensure(organizationId: string): Promise<EnsureResult> {
  const existing = await repository.retrieveByOrganization(organizationId)
  if (existing) {
    return {
      data: serializeTenant(existing),
      isNew: false,
      error: null,
    }
  }

  const now = toDbUnixSeconds(nowUnixSeconds())
  const tenantId = generateId('tenant')
  const triageProjectId = generateId('project')

  try {
    const created = await repository.createWithTriageProject({
      tenantId,
      organizationId,
      triageProjectId,
      triageProjectKey: 'TRI',
      triageProjectSlug: 'triage',
      now,
    })

    return {
      data: serializeTenant(created),
      isNew: true,
      error: null,
    }
  } catch (error) {
    // Handle concurrent execution race: if another request created the tenant, return existing
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code: string }).code === 'P2002'
    ) {
      const winner = await repository.retrieveByOrganization(organizationId)
      if (winner) {
        return {
          data: serializeTenant(winner),
          isNew: false,
          error: null,
        }
      }
    }
    throw error
  }
}
