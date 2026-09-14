import { prisma } from '@/db/client'

import type {
  TaxAuthorityCreateBody,
  TaxAuthorityUpdateBody,
  TaxRateCreateBody,
  TaxRateUpdateBody,
} from './tax.schemas'

export function findActiveCommercialTaxRateRows(
  tenantId: string,
  ids: readonly string[]
) {
  return prisma.taxRate.findMany({
    where: { tenantId, id: { in: [...ids] }, isActive: true },
    select: { id: true, name: true, rate: true, inclusive: true },
  })
}

export function listTaxAuthorityRows(tenantId: string) {
  return prisma.taxAuthority.findMany({
    where: { tenantId },
    orderBy: [{ isDefault: 'desc' }, { isActive: 'desc' }, { name: 'asc' }],
    take: 100,
  })
}

export function createTaxAuthorityRow(
  tenantId: string,
  id: string,
  body: TaxAuthorityCreateBody,
  now: number
) {
  return prisma.$transaction(async (transaction) => {
    const authorityCount = await transaction.taxAuthority.count({
      where: { tenantId, isActive: true },
    })
    const isDefault = body.isDefault || authorityCount === 0
    if (isDefault) {
      await transaction.taxAuthority.updateMany({
        where: { tenantId, isDefault: true },
        data: { isDefault: false, updatedAt: now },
      })
    }
    return transaction.taxAuthority.create({
      data: {
        id,
        tenantId,
        name: body.name,
        description: body.description ?? null,
        countryCode: body.countryCode,
        subdivisionCode: body.subdivisionCode ?? null,
        isDefault,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
    })
  })
}

export function findTaxAuthorityRow(tenantId: string, id: string) {
  return prisma.taxAuthority.findFirst({ where: { tenantId, id } })
}

export function updateTaxAuthorityRow(
  tenantId: string,
  id: string,
  body: TaxAuthorityUpdateBody,
  now: number
) {
  return prisma.$transaction(async (transaction) => {
    if (body.isDefault) {
      await transaction.taxAuthority.updateMany({
        where: { tenantId, isDefault: true },
        data: { isDefault: false, updatedAt: now },
      })
    }
    await transaction.taxAuthority.update({
      where: { id },
      data: {
        ...body,
        ...(body.isDefault ? { isActive: true } : {}),
        updatedAt: now,
      },
    })
    return transaction.taxAuthority.findFirstOrThrow({
      where: { tenantId, id },
    })
  })
}

export function listTaxRateRows(tenantId: string) {
  return prisma.taxRate.findMany({
    where: { tenantId },
    include: { taxAuthority: true },
    orderBy: [{ isActive: 'desc' }, { startsAt: 'desc' }, { name: 'asc' }],
    take: 100,
  })
}

export function findActiveTaxAuthorityRow(
  tenantId: string,
  id?: string | null
) {
  return prisma.taxAuthority.findFirst({
    where: { tenantId, isActive: true, ...(id ? { id } : { isDefault: true }) },
    select: { id: true },
  })
}

export function createTaxRateRow(
  tenantId: string,
  authorityId: string,
  id: string,
  body: TaxRateCreateBody,
  now: number
) {
  return prisma.$transaction(async (transaction) => {
    const count = await transaction.taxRate.count({
      where: { tenantId, isActive: true },
    })
    const isDefault = body.isDefault || count === 0
    if (isDefault) {
      await transaction.taxRate.updateMany({
        where: { tenantId, isDefault: true },
        data: { isDefault: false, updatedAt: now },
      })
    }
    return transaction.taxRate.create({
      data: {
        id,
        tenantId,
        taxAuthorityId: authorityId,
        name: body.name,
        description: body.description ?? null,
        taxType: body.taxType ?? null,
        rate: body.rate,
        inclusive: body.inclusive,
        startsAt: body.startsAt ?? null,
        isDefault,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
      include: { taxAuthority: true },
    })
  })
}

export function findTaxRateRow(tenantId: string, id: string) {
  return prisma.taxRate.findFirst({ where: { tenantId, id } })
}

export function updateTaxRateRow(
  tenantId: string,
  id: string,
  body: TaxRateUpdateBody,
  now: number
) {
  return prisma.$transaction(async (transaction) => {
    if (body.isDefault) {
      await transaction.taxRate.updateMany({
        where: { tenantId, isDefault: true },
        data: { isDefault: false, updatedAt: now },
      })
    }
    await transaction.taxRate.update({
      where: { id },
      data: {
        ...body,
        ...(body.isDefault ? { isActive: true } : {}),
        updatedAt: now,
      },
    })
    return transaction.taxRate.findFirstOrThrow({
      where: { tenantId, id },
      include: { taxAuthority: true },
    })
  })
}
