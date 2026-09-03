import { prisma } from '../../db/index.js'
import type { TenantRow } from './tenants.serializers.js'

export async function retrieveByOrganization(
  organizationId: string
): Promise<TenantRow | null> {
  return prisma.tenant.findUnique({
    where: { organizationId },
  })
}

export async function retrieveById(id: string): Promise<TenantRow | null> {
  return prisma.tenant.findUnique({
    where: { id },
  })
}

export async function createWithTriageProject(params: {
  tenantId: string
  organizationId: string
  triageProjectId: string
  triageProjectKey: string
  triageProjectSlug: string
  now: bigint
}): Promise<TenantRow> {
  return prisma.$transaction(async (tx) => {
    const tenant = await tx.tenant.create({
      data: {
        id: params.tenantId,
        organizationId: params.organizationId,
        triageProjectId: null,
        createdAt: params.now,
        updatedAt: params.now,
      },
    })

    await tx.project.create({
      data: {
        id: params.triageProjectId,
        tenantId: tenant.id,
        name: 'Triage',
        key: params.triageProjectKey,
        slug: params.triageProjectSlug,
        status: 'active',
        health: 'on-track',
        nextIssueNumber: 1,
        position: 0,
        createdAt: params.now,
        updatedAt: params.now,
      },
    })

    return tx.tenant.update({
      where: { id: tenant.id },
      data: {
        triageProjectId: params.triageProjectId,
        updatedAt: params.now,
      },
    })
  })
}
