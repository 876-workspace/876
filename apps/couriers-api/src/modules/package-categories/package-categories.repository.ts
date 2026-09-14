import { prisma } from '@/db/client'

import type {
  CreatePackageCategoryBody,
  ListPackageCategoriesQuery,
  ProvisionedPackageCategory,
  UpdatePackageCategoryBody,
} from './package-categories.schemas'

export async function listTenantPackageCategories(options: {
  tenantId: string
  query: ListPackageCategoriesQuery
}) {
  const cursorId = options.query.starting_after ?? options.query.ending_before
  const anchor = cursorId
    ? await findTenantPackageCategoryById(options.tenantId, cursorId)
    : null

  if (cursorId && !anchor) return []

  const rows = await prisma.packageCategory.findMany({
    where: {
      tenantId: options.tenantId,
      deletedAt: null,
      ...(options.query.is_active === undefined
        ? {}
        : { isActive: options.query.is_active }),
      ...(anchor
        ? options.query.starting_after
          ? categoriesAfter(anchor)
          : categoriesBefore(anchor)
        : {}),
    },
    orderBy: options.query.ending_before
      ? [{ sortOrder: 'desc' }, { name: 'desc' }, { id: 'desc' }]
      : [{ sortOrder: 'asc' }, { name: 'asc' }, { id: 'asc' }],
    take: options.query.limit + 1,
  })

  return options.query.ending_before ? rows.reverse() : rows
}

export function findTenantPackageCategoryById(tenantId: string, id: string) {
  return prisma.packageCategory.findFirst({
    where: { tenantId, id, deletedAt: null },
  })
}

export function findPackageCategoryById(id: string) {
  return prisma.packageCategory.findUnique({ where: { id } })
}

export function findTenantPackageCategoryBySlug(
  tenantId: string,
  slug: string,
  excludeId?: string
) {
  return prisma.packageCategory.findFirst({
    where: {
      tenantId,
      slug,
      deletedAt: null,
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
  })
}

export function findTenantPackageCategoryByProvisioningKey(
  tenantId: string,
  provisioningKey: string
) {
  return prisma.packageCategory.findFirst({
    where: { tenantId, provisioningKey, deletedAt: null },
  })
}

export function createTenantPackageCategory(options: {
  tenantId: string
  input: CreatePackageCategoryBody
  now: number
}) {
  return prisma.packageCategory.create({
    data: {
      tenantId: options.tenantId,
      name: options.input.name,
      slug: options.input.slug,
      description: options.input.description ?? null,
      icon: options.input.icon ?? null,
      sortOrder: options.input.sort_order ?? 0,
      isActive: options.input.is_active ?? true,
      createdAt: options.now,
      updatedAt: options.now,
    },
  })
}

export function updateTenantPackageCategory(options: {
  id: string
  input: UpdatePackageCategoryBody
  now: number
}) {
  return prisma.packageCategory.update({
    where: { id: options.id },
    data: {
      ...(options.input.name === undefined ? {} : { name: options.input.name }),
      ...(options.input.slug === undefined ? {} : { slug: options.input.slug }),
      ...(options.input.description === undefined
        ? {}
        : { description: options.input.description }),
      ...(options.input.icon === undefined ? {} : { icon: options.input.icon }),
      ...(options.input.sort_order === undefined
        ? {}
        : { sortOrder: options.input.sort_order }),
      ...(options.input.is_active === undefined
        ? {}
        : { isActive: options.input.is_active }),
      updatedAt: options.now,
    },
  })
}

export function archiveTenantPackageCategory(options: {
  id: string
  now: number
}) {
  return prisma.packageCategory.update({
    where: { id: options.id },
    data: { isActive: false, deletedAt: options.now, updatedAt: options.now },
  })
}

export function createProvisionedPackageCategory(options: {
  tenantId: string
  input: ProvisionedPackageCategory
  now: number
}) {
  return prisma.packageCategory.create({
    data: {
      tenantId: options.tenantId,
      provisioningKey: options.input.key,
      name: options.input.name,
      slug: options.input.key,
      description: options.input.description ?? null,
      icon: options.input.icon ?? null,
      sortOrder: options.input.sort_order,
      isActive: options.input.is_active,
      createdAt: options.now,
      updatedAt: options.now,
    },
  })
}

export function adoptProvisionedPackageCategory(options: {
  id: string
  provisioningKey: string
  now: number
}) {
  return prisma.packageCategory.update({
    where: { id: options.id },
    data: {
      provisioningKey: options.provisioningKey,
      updatedAt: options.now,
    },
  })
}

function categoriesAfter(anchor: {
  sortOrder: number
  name: string
  id: string
}) {
  return {
    OR: [
      { sortOrder: { gt: anchor.sortOrder } },
      { sortOrder: anchor.sortOrder, name: { gt: anchor.name } },
      {
        sortOrder: anchor.sortOrder,
        name: anchor.name,
        id: { gt: anchor.id },
      },
    ],
  }
}

function categoriesBefore(anchor: {
  sortOrder: number
  name: string
  id: string
}) {
  return {
    OR: [
      { sortOrder: { lt: anchor.sortOrder } },
      { sortOrder: anchor.sortOrder, name: { lt: anchor.name } },
      {
        sortOrder: anchor.sortOrder,
        name: anchor.name,
        id: { lt: anchor.id },
      },
    ],
  }
}
