import { randomUUID } from 'node:crypto'

import { prisma } from '../../db/index.js'
import type { Prisma } from '../../db/generated/prisma/client.js'

type CreateCategoryParams = Omit<
  Prisma.RequestCategoryDefUncheckedCreateInput,
  'id'
>
type UpdateCategoryParams = Prisma.RequestCategoryDefUncheckedUpdateInput
type CreateSubcategoryParams = Omit<
  Prisma.RequestSubcategoryUncheckedCreateInput,
  'id'
>
type UpdateSubcategoryParams = Prisma.RequestSubcategoryUncheckedUpdateInput

export const list = (tenantId: string) =>
  prisma.requestCategoryDef.findMany({
    where: { tenantId, deletedAt: null },
    include: {
      subcategories: {
        where: { deletedAt: null },
        orderBy: { sortOrder: 'asc' },
      },
    },
    orderBy: { sortOrder: 'asc' },
  })

export const retrieve = (tenantId: string, id: string) =>
  prisma.requestCategoryDef.findFirst({
    where: { tenantId, id, deletedAt: null },
    include: {
      subcategories: {
        where: { deletedAt: null },
        orderBy: { sortOrder: 'asc' },
      },
    },
  })

export const retrieveByProvisioningKey = (
  tenantId: string,
  provisioningKey: string
) =>
  prisma.requestCategoryDef.findFirst({
    where: { tenantId, provisioningKey, deletedAt: null },
    include: {
      subcategories: {
        where: { deletedAt: null },
        orderBy: { sortOrder: 'asc' },
      },
    },
  })

export const create = (params: CreateCategoryParams) =>
  prisma.requestCategoryDef.create({
    data: { id: `crm_cat_${randomUUID().replaceAll('-', '')}`, ...params },
    include: {
      subcategories: {
        where: { deletedAt: null },
        orderBy: { sortOrder: 'asc' },
      },
    },
  })

export const update = (id: string, params: UpdateCategoryParams) =>
  prisma.requestCategoryDef.update({
    where: { id },
    data: params,
    include: {
      subcategories: {
        where: { deletedAt: null },
        orderBy: { sortOrder: 'asc' },
      },
    },
  })

export const used = (tenantId: string, id: string) =>
  prisma.request.findFirst({
    where: { tenantId, categoryId: id, deletedAt: null },
    select: { id: true },
  })

export async function remove(params: {
  id: string
  deletedBy: string
  reason?: string
}) {
  if (process.env.DELETION_MODE === 'hard')
    await prisma.requestCategoryDef.delete({ where: { id: params.id } })
  else
    await prisma.requestCategoryDef.update({
      where: { id: params.id },
      data: { deletedAt: new Date(), deletedBy: params.deletedBy },
    })

  return {
    object: 'request_category' as const,
    id: params.id,
    deleted: true as const,
  }
}

export const retrieveSub = (
  tenantId: string,
  categoryId: string,
  id: string
) =>
  prisma.requestSubcategory.findFirst({
    where: { tenantId, categoryId, id, deletedAt: null },
  })

export const retrieveSubByProvisioningKey = (
  tenantId: string,
  provisioningKey: string
) =>
  prisma.requestSubcategory.findFirst({
    where: { tenantId, provisioningKey, deletedAt: null },
  })

export const createSub = (params: CreateSubcategoryParams) =>
  prisma.requestSubcategory.create({
    data: { id: `crm_subcat_${randomUUID().replaceAll('-', '')}`, ...params },
  })

export const updateSub = (id: string, params: UpdateSubcategoryParams) =>
  prisma.requestSubcategory.update({ where: { id }, data: params })

export const usedSub = (tenantId: string, id: string) =>
  prisma.request.findFirst({
    where: { tenantId, subcategoryId: id, deletedAt: null },
    select: { id: true },
  })

export async function removeSub(params: {
  id: string
  deletedBy: string
  reason?: string
}) {
  if (process.env.DELETION_MODE === 'hard')
    await prisma.requestSubcategory.delete({ where: { id: params.id } })
  else
    await prisma.requestSubcategory.update({
      where: { id: params.id },
      data: { deletedAt: new Date(), deletedBy: params.deletedBy },
    })

  return {
    object: 'request_subcategory' as const,
    id: params.id,
    deleted: true as const,
  }
}
