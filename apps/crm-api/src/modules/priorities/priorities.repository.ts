import { randomUUID } from 'node:crypto'

import { prisma } from '../../db/index.js'
import type { Prisma } from '../../db/generated/prisma/client.js'

type CreateParams = Omit<Prisma.RequestPriorityDefUncheckedCreateInput, 'id'>
type UpdateParams = Prisma.RequestPriorityDefUncheckedUpdateInput

export function list(tenantId: string, active?: boolean) {
  return prisma.requestPriorityDef.findMany({
    where: {
      tenantId,
      deletedAt: null,
      ...(active === undefined ? {} : { isActive: active }),
    },
    orderBy: [{ sortOrder: 'asc' }, { weight: 'asc' }, { name: 'asc' }],
  })
}

export function retrieve(tenantId: string, id: string) {
  return prisma.requestPriorityDef.findFirst({
    where: { tenantId, id, deletedAt: null },
  })
}

export function retrieveActive(tenantId: string, id: string) {
  return prisma.requestPriorityDef.findFirst({
    where: { tenantId, id, deletedAt: null, isActive: true },
  })
}

export function retrieveDefault(tenantId: string) {
  return prisma.requestPriorityDef.findFirst({
    where: { tenantId, deletedAt: null, isActive: true, isDefault: true },
  })
}

export function retrieveByProvisioningKey(
  tenantId: string,
  provisioningKey: string
) {
  return prisma.requestPriorityDef.findFirst({
    where: { tenantId, provisioningKey, deletedAt: null },
  })
}

export function create(params: CreateParams) {
  return prisma.requestPriorityDef.create({
    data: {
      id: `pri_${randomUUID().replaceAll('-', '')}`,
      ...params,
    },
  })
}

export function update(id: string, params: UpdateParams) {
  return prisma.requestPriorityDef.update({ where: { id }, data: params })
}

export function setDefault(tenantId: string, id: string) {
  return prisma.$transaction(async (tx) => {
    await tx.requestPriorityDef.updateMany({
      where: { tenantId, deletedAt: null, isDefault: true },
      data: { isDefault: false },
    })

    return tx.requestPriorityDef.update({
      where: { id },
      data: { isDefault: true, isActive: true },
    })
  })
}

export async function isReferenced(tenantId: string, id: string) {
  const [request, task, category, subcategory, form] = await Promise.all([
    prisma.request.findFirst({
      where: { tenantId, priorityId: id, deletedAt: null },
      select: { id: true },
    }),
    prisma.requestTask.findFirst({
      where: { tenantId, priorityId: id, deletedAt: null },
      select: { id: true },
    }),
    prisma.requestCategoryDef.findFirst({
      where: { tenantId, defaultPriorityId: id, deletedAt: null },
      select: { id: true },
    }),
    prisma.requestSubcategory.findFirst({
      where: { tenantId, defaultPriorityId: id, deletedAt: null },
      select: { id: true },
    }),
    prisma.requestForm.findFirst({
      where: { tenantId, defaultPriorityId: id, deletedAt: null },
      select: { id: true },
    }),
  ])

  return Boolean(request || task || category || subcategory || form)
}

export async function remove(id: string, deletedBy: string) {
  if (process.env.DELETION_MODE === 'hard')
    await prisma.requestPriorityDef.delete({ where: { id } })
  else
    await prisma.requestPriorityDef.update({
      where: { id },
      data: {
        isActive: false,
        isDefault: false,
        deletedAt: new Date(),
        deletedBy,
      },
    })

  return {
    object: 'request_priority' as const,
    id,
    deleted: true as const,
  }
}
