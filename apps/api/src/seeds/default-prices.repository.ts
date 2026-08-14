import { prisma } from '@/db/client'

export type SeedAppRow = { id: string; slug: string; name: string }

/** The app row a free price is seeded against. Null when the app does not exist. */
export async function findAppBySlug(slug: string): Promise<SeedAppRow | null> {
  return prisma.app.findFirst({
    where: { slug },
    select: { id: true, slug: true, name: true },
  })
}

/**
 * The app's current default price, if any — the same predicate
 * `provisioning.repository.findDefaultPriceForApp` uses. A non-null result means
 * the app already has pricing and the seed must leave it untouched.
 */
export async function findActivePriceForApp(
  appId: string
): Promise<{ id: string } | null> {
  return prisma.price.findFirst({
    where: { status: 'active', product: { appId, status: 'active' } },
    orderBy: [{ product: { createdAt: 'asc' } }, { createdAt: 'asc' }],
    select: { id: true },
  })
}

/** Look up a product by its unique slug (used for idempotency on the product row). */
export async function findProductBySlug(
  slug: string
): Promise<{ id: string } | null> {
  return prisma.product.findUnique({ where: { slug }, select: { id: true } })
}

export async function createProduct(data: {
  id: string
  slug: string
  name: string
  appId: string
  now: bigint
}): Promise<{ id: string }> {
  return prisma.product.create({
    data: {
      id: data.id,
      slug: data.slug,
      name: data.name,
      appId: data.appId,
      status: 'active',
      active: true,
      createdAt: data.now,
      updatedAt: data.now,
    },
    select: { id: true },
  })
}

export async function createFreePrice(data: {
  id: string
  productId: string
  name: string
  now: bigint
}): Promise<{ id: string }> {
  return prisma.price.create({
    data: {
      id: data.id,
      productId: data.productId,
      name: data.name,
      status: 'active',
      active: true,
      type: 'recurring',
      billingInterval: 'month',
      intervalCount: 1,
      unitAmount: BigInt(0),
      currency: 'jmd',
      billingScheme: 'per_unit',
      createdAt: data.now,
      updatedAt: data.now,
    },
    select: { id: true },
  })
}
