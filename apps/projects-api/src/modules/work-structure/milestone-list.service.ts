import { getError, type ProjectsError } from '../../http/errors.js'
import * as tenants from '../tenants/index.js'
import { prisma } from '../../db/index.js'
import { serializeMilestone, type SerializedMilestone } from './work-structure.serializers.js'

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

  const rows = await prisma.milestone.findMany({
    where: {
      tenantId: tenant.id,
      deletedAt: null,
      ...(status ? { status } : {}),
    },
    orderBy: [{ projectId: 'asc' }, { position: 'asc' }, { key: 'asc' }],
  })

  return { data: rows.map(serializeMilestone), error: null }
}
