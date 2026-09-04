import { prisma } from '../../db/index.js'
import { generateId } from '../../platform/ids.js'
import type { TenantRow } from './tenants.serializers.js'
import type { WorkStructurePreset } from '../work-structure/presets.js'

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

export async function updatePresetKey(
  id: string,
  presetKey: string,
  updatedAt: bigint
): Promise<TenantRow> {
  return prisma.tenant.update({ where: { id }, data: { presetKey, updatedAt } })
}

export async function createWithTriageProject(params: {
  tenantId: string
  organizationId: string
  triageProjectId: string
  triageProjectKey: string
  triageProjectSlug: string
  now: bigint
  preset: WorkStructurePreset
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

    await tx.workItemType.createMany({
      data: params.preset.workItemTypes.map((item) => ({
        id: generateId('workItemType'),
        tenantId: tenant.id,
        ...item,
        description: null,
        archivedAt: null,
        createdAt: params.now,
        updatedAt: params.now,
      })),
    })
    await tx.workflowState.createMany({
      data: params.preset.workflowStates.map((item) => ({
        id: generateId('workflowState'),
        tenantId: tenant.id,
        ...item,
        description: null,
        archivedAt: null,
        createdAt: params.now,
        updatedAt: params.now,
      })),
    })
    if (params.preset.customFields.length > 0) {
      await tx.customField.createMany({
        data: params.preset.customFields.map((item) => ({
          id: generateId('customField'),
          tenantId: tenant.id,
          ...item,
          options: undefined,
          required: false,
          description: null,
          archivedAt: null,
          createdAt: params.now,
          updatedAt: params.now,
        })),
      })
    }

    return tx.tenant.update({
      where: { id: tenant.id },
      data: {
        triageProjectId: params.triageProjectId,
        updatedAt: params.now,
      },
    })
  })
}
