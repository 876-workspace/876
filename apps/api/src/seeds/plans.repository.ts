import { prisma } from '@/db/client'

export type AppRow = { id: string; slug: string }
export type FeatureRow = { id: string; slug: string }
export type ProductRow = { id: string; slug: string }
export type ApplicationModuleRow = {
  id: string
  appId: string
  key: string
  featureId: string | null
}
export type PlanModuleRow = { id: string; productId: string; moduleId: string }

export async function listApps(): Promise<AppRow[]> {
  const rows = await prisma.app.findMany({ select: { id: true, slug: true } })
  return rows
}

export async function listFeatures(): Promise<FeatureRow[]> {
  const rows = await prisma.feature.findMany({
    select: { id: true, slug: true },
  })
  return rows
}

export async function listProducts(): Promise<ProductRow[]> {
  const rows = await prisma.product.findMany({
    select: { id: true, slug: true },
  })
  return rows
}

export async function findApplicationModule(
  appId: string,
  key: string
): Promise<ApplicationModuleRow | null> {
  const row = await prisma.applicationModule.findFirst({
    where: { appId, key },
    select: { id: true, appId: true, key: true, featureId: true },
  })
  return row
}

export async function createApplicationModule(params: {
  id: string
  appId: string
  key: string
  name: string
  description: string
  featureId: string | null
  status: string
  position: number
  createdAt: bigint
  updatedAt: bigint
}): Promise<ApplicationModuleRow> {
  const row = await prisma.applicationModule.create({
    data: {
      id: params.id,
      appId: params.appId,
      key: params.key,
      name: params.name,
      description: params.description,
      featureId: params.featureId,
      status: params.status,
      position: params.position,
      createdAt: params.createdAt,
      updatedAt: params.updatedAt,
    },
    select: { id: true, appId: true, key: true, featureId: true },
  })
  return row
}

export async function findPlanModule(
  productId: string,
  moduleId: string
): Promise<PlanModuleRow | null> {
  const row = await prisma.planModule.findFirst({
    where: { productId, moduleId },
    select: { id: true, productId: true, moduleId: true },
  })
  return row
}

export async function createPlanModule(params: {
  id: string
  productId: string
  moduleId: string
  createdAt: bigint
  updatedAt: bigint
}): Promise<void> {
  await prisma.planModule.create({
    data: {
      id: params.id,
      productId: params.productId,
      moduleId: params.moduleId,
      createdAt: params.createdAt,
      updatedAt: params.updatedAt,
    },
  })
}

export async function findAppBySlug(slug: string): Promise<AppRow | null> {
  return prisma.app.findUnique({
    where: { slug },
    select: { id: true, slug: true },
  })
}

export async function findProductBySlug(
  slug: string
): Promise<ProductRow | null> {
  return prisma.product.findUnique({
    where: { slug },
    select: { id: true, slug: true },
  })
}

export async function findPriceForProduct(
  productId: string
): Promise<{ id: string } | null> {
  const row = await prisma.price.findFirst({
    where: { productId, active: true },
    orderBy: { createdAt: 'asc' },
    select: { id: true },
  })
  return row
}

export async function listSubscriptionsByApp(
  appId: string
): Promise<Array<{ id: string; items: Array<{ priceId: string }> }>> {
  const rows = await prisma.subscription.findMany({
    where: { appId },
    select: {
      id: true,
      subscriptionItems: { select: { priceId: true } },
    },
  })
  return rows.map((row) => ({
    id: row.id,
    items: row.subscriptionItems.map((item) => ({ priceId: item.priceId })),
  }))
}

export async function getSubscription(
  organizationId: string,
  appId: string
): Promise<{ id: string; items: Array<{ priceId: string }> } | null> {
  const row = await prisma.subscription.findFirst({
    where: { organizationId, appId },
    select: {
      id: true,
      subscriptionItems: { select: { priceId: true } },
    },
  })
  if (!row) return null
  return {
    id: row.id,
    items: row.subscriptionItems.map((item) => ({ priceId: item.priceId })),
  }
}

export async function setSubscriptionPrice(
  subscriptionId: string,
  priceId: string
): Promise<void> {
  // Delete existing items and create one with the new price — mirrors
  // SubscriptionRepository.set_price which replaces items.
  await prisma.subscriptionItem.deleteMany({ where: { subscriptionId } })
  const { generateId } = await import('@/platform/ids')
  const now = BigInt(Math.floor(Date.now() / 1000))
  await prisma.subscriptionItem.create({
    data: {
      id: generateId('subscriptionItem'),
      subscriptionId,
      priceId,
      quantity: 1,
      createdAt: now,
      updatedAt: now,
    },
  })
}

export async function provisionSubscription(params: {
  organizationId: string
  appId: string
  priceId: string
}): Promise<void> {
  const { generateId } = await import('@/platform/ids')
  const now = BigInt(Math.floor(Date.now() / 1000))
  const subscriptionId = generateId('subscription')
  await prisma.subscription.create({
    data: {
      id: subscriptionId,
      organizationId: params.organizationId,
      appId: params.appId,
      status: 'active',
      financeLifecycleVersion: 0,
      createdAt: now,
      updatedAt: now,
    },
  })
  await prisma.subscriptionItem.create({
    data: {
      id: generateId('subscriptionItem'),
      subscriptionId,
      priceId: params.priceId,
      quantity: 1,
      createdAt: now,
      updatedAt: now,
    },
  })
}

export async function findOwnerOrganizationId(
  ownerEmail: string
): Promise<string | null> {
  const row = await prisma.$queryRaw<Array<{ organization_id: string }>>`
    SELECT m.organization_id as organization_id
      FROM memberships m
      JOIN users u ON u.id = m.user_id
     WHERE lower(u.email) = lower(${ownerEmail})
       AND m.status = 'active'
  ORDER BY (m.role = 'owner') DESC, m.created_at ASC
     LIMIT 1`
  if (row.length === 0) return null
  return row[0]!.organization_id
}
