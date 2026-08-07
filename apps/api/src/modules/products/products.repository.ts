import { Prisma } from '@/db'
import { prisma } from '@/db/client'

import type { PriceRow, ProductRow } from './products.serializers'

/** Every query against `products`, `prices`, and `plan_modules`. */

const PRICE_SELECT = {
  id: true,
  productId: true,
  billingInterval: true,
  intervalCount: true,
  status: true,
  unitAmount: true,
  unitAmountDecimal: true,
  currency: true,
  lookupKey: true,
  name: true,
  nickname: true,
  type: true,
  billingScheme: true,
  tiersMode: true,
  tiers: true,
  recurring: true,
  taxBehavior: true,
  transformQuantity: true,
  trialPeriodDays: true,
  active: true,
  metadata: true,
  createdAt: true,
  updatedAt: true,
  archivedAt: true,
} as const

// Prices and plan modules are both ordered oldest-first, matching the
// `order_by` on the SQLAlchemy relationships they replace — the initial price
// of a plan stays first in the array a Console page renders.
const PRODUCT_SELECT = {
  id: true,
  slug: true,
  name: true,
  description: true,
  appId: true,
  status: true,
  active: true,
  statementDescriptor: true,
  unitLabel: true,
  taxCodeId: true,
  lookupKey: true,
  metadata: true,
  createdAt: true,
  updatedAt: true,
  archivedAt: true,
  app: { select: { slug: true, name: true, logoUrl: true, appKind: true } },
  prices: { select: PRICE_SELECT, orderBy: { createdAt: 'asc' as const } },
  planModules: {
    select: { moduleId: true },
    orderBy: { createdAt: 'asc' as const },
  },
} as const

/**
 * A cleared `Json` column is `Prisma.DbNull`, not `null`.
 *
 * Prisma distinguishes SQL NULL from the JSON value `null`, and plain `null` is
 * not accepted on a nullable Json field. Translating here keeps that detail
 * inside the repository, where every other storage concern lives.
 */
function jsonInput(
  value: Record<string, unknown> | null | undefined
): Prisma.InputJsonValue | typeof Prisma.DbNull | undefined {
  if (value === undefined) return undefined

  return value === null ? Prisma.DbNull : (value as Prisma.InputJsonValue)
}

export function findById(productId: string): Promise<ProductRow | null> {
  return prisma.product.findUnique({
    where: { id: productId },
    select: PRODUCT_SELECT,
  })
}

export function findBySlug(slug: string): Promise<ProductRow | null> {
  return prisma.product.findUnique({ where: { slug }, select: PRODUCT_SELECT })
}

export function list(filters: {
  appId?: string
  status?: string
}): Promise<ProductRow[]> {
  return prisma.product.findMany({
    where: {
      ...(filters.appId !== undefined ? { appId: filters.appId } : {}),
      ...(filters.status ? { status: filters.status } : {}),
    },
    orderBy: { createdAt: 'asc' },
    select: PRODUCT_SELECT,
  })
}

export type ProductCreateData = {
  id: string
  slug: string
  name: string
  description: string | null
  appId: string | null
  lookupKey: string | null
  taxCodeId: string | null
  metadata: Record<string, unknown> | null
  status: string
  createdAt: bigint
  updatedAt: bigint
}

export function create(data: ProductCreateData): Promise<ProductRow> {
  const { metadata, ...rest } = data

  return prisma.product.create({
    data: { ...rest, metadata: jsonInput(metadata) },
    select: PRODUCT_SELECT,
  })
}

export type ProductUpdateData = {
  slug?: string
  name?: string
  description?: string | null
  taxCodeId?: string | null
  metadata?: Record<string, unknown> | null
  active?: boolean
  status?: string
  archivedAt?: bigint | null
  updatedAt: bigint
}

export async function update(
  productId: string,
  data: ProductUpdateData
): Promise<ProductRow | null> {
  const exists = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true },
  })
  if (!exists) return null

  const { metadata, ...rest } = data

  return prisma.product.update({
    where: { id: productId },
    data: {
      ...rest,
      ...('metadata' in data ? { metadata: jsonInput(metadata) } : {}),
    },
    select: PRODUCT_SELECT,
  })
}

export function findPriceById(priceId: string): Promise<PriceRow | null> {
  return prisma.price.findUnique({
    where: { id: priceId },
    select: PRICE_SELECT,
  })
}

export type PriceCreateData = {
  id: string
  productId: string
  unitAmount: number | null
  currency: string
  billingInterval: string | null
  intervalCount: number | null
  name: string | null
  nickname: string | null
  status: string
  createdAt: bigint
  updatedAt: bigint
}

export function createPrice(data: PriceCreateData): Promise<PriceRow> {
  return prisma.price.create({
    data: {
      ...data,
      unitAmount: data.unitAmount === null ? null : BigInt(data.unitAmount),
    },
    select: PRICE_SELECT,
  })
}

export type PriceUpdateData = {
  name?: string | null
  nickname?: string | null
  active?: boolean
  metadata?: Record<string, unknown> | null
  status?: string
  updatedAt: bigint
}

export function updatePrice(
  priceId: string,
  data: PriceUpdateData
): Promise<PriceRow> {
  const { metadata, ...rest } = data

  return prisma.price.update({
    where: { id: priceId },
    data: {
      ...rest,
      ...('metadata' in data ? { metadata: jsonInput(metadata) } : {}),
    },
    select: PRICE_SELECT,
  })
}

export function findModules(
  moduleIds: string[]
): Promise<{ id: string; appId: string; status: string }[]> {
  return prisma.applicationModule.findMany({
    where: { id: { in: moduleIds } },
    select: { id: true, appId: true, status: true },
  })
}

export function findApp(
  appId: string
): Promise<{ id: string; appKind: string } | null> {
  return prisma.app.findUnique({
    where: { id: appId },
    select: { id: true, appKind: true },
  })
}

export async function taxCodeExists(taxCodeId: string): Promise<boolean> {
  const row = await prisma.taxCode.findUnique({
    where: { id: taxCodeId },
    select: { id: true },
  })
  return row !== null
}

/**
 * Replace a plan's module set, retaining the associations that did not change.
 *
 * Deleting every row and re-inserting would churn `created_at` on modules the
 * caller left alone, so only the difference in each direction is written.
 */
export async function replaceModules(
  productId: string,
  moduleIds: string[],
  now: bigint,
  generateRowId: () => string
): Promise<void> {
  const existing = await prisma.planModule.findMany({
    where: { productId },
    select: { moduleId: true },
  })
  const existingIds = new Set(existing.map((row) => row.moduleId))
  const requestedIds = new Set(moduleIds)

  const removed = [...existingIds].filter((id) => !requestedIds.has(id))
  if (removed.length > 0)
    await prisma.planModule.deleteMany({
      where: { productId, moduleId: { in: removed } },
    })

  const added = [...requestedIds].filter((id) => !existingIds.has(id))
  if (added.length > 0)
    await prisma.planModule.createMany({
      data: added.map((moduleId) => ({
        id: generateRowId(),
        productId,
        moduleId,
        createdAt: now,
        updatedAt: now,
      })),
    })
}
