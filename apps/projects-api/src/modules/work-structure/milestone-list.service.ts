import { getError, type ProjectsError } from '../../http/errors.js'
import * as tenants from '../tenants/index.js'
import * as repository from './milestone-list.repository.js'
import {
  serializeMilestone,
  type SerializedMilestone,
} from './work-structure.serializers.js'

export type ServiceResult<T> =
  | { data: T; error: null }
  | { data: null; error: ProjectsError }

export async function listOrganizationMilestones(
  organizationId: string,
  status?: 'open' | 'completed' | 'canceled'
): Promise<ServiceResult<SerializedMilestone[]>> {
  const tenant = await tenants.resolveTenant(organizationId)
  if (!tenant)
    return { data: null, error: getError('projects/tenant-not-found') }

  const rows = await repository.listOrganizationMilestones(tenant.id, status)
  return { data: rows.map(serializeMilestone), error: null }
}
