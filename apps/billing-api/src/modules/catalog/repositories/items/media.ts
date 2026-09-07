import { nowUnixSeconds } from '@876/core/timestamps'

import { prisma } from '@/db/client'
import { generateId } from '@/platform/ids'
import type {
  ItemMediaAttachParams,
  ItemMediaReorderParams,
} from '../../schemas/item'
import type { ServiceResult } from '../../schemas/api'

import { err, ok } from '../result'
import { isUniqueConstraintError } from '../prisma-error'

async function resolveTarget(
  tenantId: string,
  itemId: string,
  variantId?: string
): Promise<
  | { itemId: string; variantId: string | null; targetKey: string }
  | null
> {
  const item = await prisma.item.findFirst({
    where: { id: itemId, tenantId },
    select: { id: true },
  })
  if (!item) return null
  if (!variantId)
    return { itemId: item.id, variantId: null, targetKey: item.id }

  const variant = await prisma.itemVariant.findFirst({
    where: { id: variantId, itemId, tenantId },
    select: { id: true },
  })
  return variant
    ? { itemId: item.id, variantId: variant.id, targetKey: variant.id }
    : null
}

export async function list(
  tenantId: string,
  itemId: string,
  variantId?: string
) {
  const target = await resolveTarget(tenantId, itemId, variantId)
  if (!target) return null

  return prisma.itemMedia.findMany({
    where: { tenantId, targetKey: target.targetKey },
    orderBy: { position: 'asc' },
  })
}

export async function attach(
  tenantId: string,
  itemId: string,
  params: ItemMediaAttachParams,
  variantId?: string
): ServiceResult<{ id: string }> {
  const target = await resolveTarget(tenantId, itemId, variantId)
  if (!target)
    return err(
      variantId ? 'Item variant not found.' : 'Item not found.',
      404,
      variantId ? 'billing/item-variant-not-found' : undefined
    )

  const existing = await prisma.itemMedia.findFirst({
    where: { tenantId, targetKey: target.targetKey, fileId: params.fileId },
    select: { id: true },
  })
  if (existing) return ok(existing)

  const last = await prisma.itemMedia.findFirst({
    where: { tenantId, targetKey: target.targetKey },
    orderBy: { position: 'desc' },
    select: { position: true },
  })
  const position = params.position ?? (last?.position ?? -1) + 1
  if (position > 19) return err('An item may have at most 20 images.', 422)

  try {
    const now = nowUnixSeconds()
    const row = await prisma.$transaction(async (tx) => {
      if (params.position !== undefined) {
        await tx.itemMedia.updateMany({
          where: {
            tenantId,
            targetKey: target.targetKey,
            position: { gte: position },
          },
          data: { position: { increment: 1000 }, updatedAt: now },
        })
        await tx.itemMedia.updateMany({
          where: {
            tenantId,
            targetKey: target.targetKey,
            position: { gte: position + 1000 },
          },
          data: { position: { decrement: 999 }, updatedAt: now },
        })
      }

      return tx.itemMedia.create({
        data: {
          id: generateId('ItemMedia'),
          tenantId,
          itemId: target.itemId,
          variantId: target.variantId,
          targetKey: target.targetKey,
          fileId: params.fileId,
          position,
          createdAt: now,
          updatedAt: now,
        },
      })
    })
    return ok({ id: row.id })
  } catch (error) {
    if (isUniqueConstraintError(error))
      return err('This image is already attached at that position.', 409)
    console.error('[billing.service.items.media.attach]', error)
    return err('Failed to attach item media.', 500)
  }
}

export async function reorder(
  tenantId: string,
  itemId: string,
  params: ItemMediaReorderParams,
  variantId?: string
): ServiceResult<{ ids: string[] }> {
  const target = await resolveTarget(tenantId, itemId, variantId)
  if (!target)
    return err(
      variantId ? 'Item variant not found.' : 'Item not found.',
      404,
      variantId ? 'billing/item-variant-not-found' : undefined
    )

  const rows = await prisma.itemMedia.findMany({
    where: { tenantId, targetKey: target.targetKey },
    select: { id: true, fileId: true },
  })
  const current = new Set(rows.map((row) => row.fileId))
  const requested = new Set(params.fileIds)
  if (
    requested.size !== params.fileIds.length ||
    current.size !== requested.size ||
    [...current].some((fileId) => !requested.has(fileId))
  )
    return err('Reorder must include each attached image exactly once.', 422)

  const byFileId = new Map(rows.map((row) => [row.fileId, row.id]))
  const now = nowUnixSeconds()
  await prisma.$transaction(async (tx) => {
    for (const [index, fileId] of params.fileIds.entries())
      await tx.itemMedia.update({
        where: { id: byFileId.get(fileId)! },
        data: { position: 1000 + index, updatedAt: now },
      })
    for (const [index, fileId] of params.fileIds.entries())
      await tx.itemMedia.update({
        where: { id: byFileId.get(fileId)! },
        data: { position: index, updatedAt: now },
      })
  })

  return ok({ ids: params.fileIds.map((fileId) => byFileId.get(fileId)!) })
}

export async function remove(
  tenantId: string,
  itemId: string,
  fileId: string,
  variantId?: string
): ServiceResult<{ id: string }> {
  const target = await resolveTarget(tenantId, itemId, variantId)
  if (!target)
    return err(
      variantId ? 'Item variant not found.' : 'Item not found.',
      404,
      variantId ? 'billing/item-variant-not-found' : undefined
    )

  const row = await prisma.itemMedia.findFirst({
    where: { tenantId, targetKey: target.targetKey, fileId },
    select: { id: true, position: true },
  })
  if (!row) return err('Item media not found.', 404)

  const now = nowUnixSeconds()
  await prisma.$transaction(async (tx) => {
    await tx.itemMedia.delete({ where: { id: row.id } })
    await tx.itemMedia.updateMany({
      where: {
        tenantId,
        targetKey: target.targetKey,
        position: { gt: row.position },
      },
      data: { position: { increment: 1000 }, updatedAt: now },
    })
    await tx.itemMedia.updateMany({
      where: {
        tenantId,
        targetKey: target.targetKey,
        position: { gt: row.position + 1000 },
      },
      data: { position: { decrement: 1001 }, updatedAt: now },
    })
  })
  return ok({ id: row.id })
}

export const media = { list, attach, reorder, remove }
