import { Prisma } from '@/db'
import { prisma } from '@/db/client'

import type {
  BillingAccountRow,
  SubscriptionItemRow,
  SubscriptionRow,
} from './billing.serializers'

// ── Billing Accounts ──────────────────────────────────────────────────────────

const BILLING_ACCOUNT_SELECT = {
  id: true,
  organizationId: true,
  name: true,
  email: true,
  invoiceEmail: true,
  currency: true,
  taxExempt: true,
  balance: true,
  defaultPaymentMethodId: true,
  invoiceSettings: true,
  preferredLocales: true,
  address: true,
  shipping: true,
  metadata: true,
  createdAt: true,
  updatedAt: true,
} as const

/**
 * A nullable Json column is cleared with `Prisma.DbNull`, never `null` —
 * `null` is not assignable to a nullable Json input and, where it is accepted,
 * means "JSON null" rather than "SQL NULL".
 */
function toJsonInput(
  value: unknown
): Prisma.InputJsonValue | typeof Prisma.DbNull {
  return value === null || value === undefined
    ? Prisma.DbNull
    : (value as Prisma.InputJsonValue)
}

export function listBillingAccounts(params: {
  organizationId?: string | null
  limit: number
}): Promise<BillingAccountRow[]> {
  const where: Record<string, unknown> = {}
  if (params.organizationId) where.organizationId = params.organizationId
  return prisma.billingAccount.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: params.limit,
    select: BILLING_ACCOUNT_SELECT,
  }) as Promise<BillingAccountRow[]>
}

export function findBillingAccountById(
  accountId: string
): Promise<BillingAccountRow | null> {
  return prisma.billingAccount.findUnique({
    where: { id: accountId },
    select: BILLING_ACCOUNT_SELECT,
  }) as Promise<BillingAccountRow | null>
}

export function createBillingAccount(data: {
  id: string
  organizationId: string
  name?: string | null
  email?: string | null
  invoiceEmail?: string | null
  currency: string
  taxExempt?: string | null
  invoiceSettings?: unknown
  preferredLocales?: unknown
  address?: unknown
  shipping?: unknown
  metadata?: unknown
  createdAt: bigint
  updatedAt: bigint
}): Promise<BillingAccountRow> {
  return prisma.billingAccount.create({
    data: {
      id: data.id,
      organizationId: data.organizationId,
      name: data.name ?? null,
      email: data.email ?? null,
      invoiceEmail: data.invoiceEmail ?? null,
      currency: data.currency,
      taxExempt: data.taxExempt ?? null,
      invoiceSettings: toJsonInput(data.invoiceSettings),
      preferredLocales: toJsonInput(data.preferredLocales),
      address: toJsonInput(data.address),
      shipping: toJsonInput(data.shipping),
      metadata: toJsonInput(data.metadata),
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    },
    select: BILLING_ACCOUNT_SELECT,
  }) as Promise<BillingAccountRow>
}

export async function updateBillingAccount(
  accountId: string,
  data: Record<string, unknown>
): Promise<BillingAccountRow | null> {
  const existing = await prisma.billingAccount.findUnique({
    where: { id: accountId },
    select: { id: true },
  })
  if (!existing) return null
  const mapped: Record<string, unknown> = {}
  if ('name' in data) mapped.name = data.name
  if ('email' in data) mapped.email = data.email
  if ('invoiceEmail' in data) mapped.invoiceEmail = data.invoiceEmail
  if ('currency' in data) mapped.currency = data.currency
  if ('taxExempt' in data) mapped.taxExempt = data.taxExempt
  if ('defaultPaymentMethodId' in data)
    mapped.defaultPaymentMethodId = data.defaultPaymentMethodId
  if ('invoiceSettings' in data)
    mapped.invoiceSettings = toJsonInput(data.invoiceSettings)
  if ('preferredLocales' in data)
    mapped.preferredLocales = toJsonInput(data.preferredLocales)
  if ('address' in data) mapped.address = toJsonInput(data.address)
  if ('shipping' in data) mapped.shipping = toJsonInput(data.shipping)
  if ('metadata' in data) mapped.metadata = toJsonInput(data.metadata)
  mapped.updatedAt = BigInt(Math.floor(Date.now() / 1000))
  return prisma.billingAccount.update({
    where: { id: accountId },
    data: mapped,
    select: BILLING_ACCOUNT_SELECT,
  }) as Promise<BillingAccountRow>
}

export async function deleteBillingAccount(
  accountId: string
): Promise<boolean> {
  const existing = await prisma.billingAccount.findUnique({
    where: { id: accountId },
    select: { id: true },
  })
  if (!existing) return false
  await prisma.billingAccount.delete({ where: { id: accountId } })
  return true
}

// ── Subscriptions ─────────────────────────────────────────────────────────────

export async function findAppById(appId: string) {
  return prisma.app.findUnique({
    where: { id: appId },
    select: { id: true, appKind: true },
  })
}

export async function findPriceById(priceId: string) {
  return prisma.price.findUnique({
    where: { id: priceId },
    select: { id: true },
  })
}

export async function findSubscriptionById(
  subscriptionId: string
): Promise<SubscriptionRow | null> {
  const row = await prisma.subscription.findUnique({
    where: { id: subscriptionId },
    include: {
      app: true,
      subscriptionItems: { include: { price: { include: { product: true } } } },
    },
  })
  return row as unknown as SubscriptionRow | null
}

export function listSubscriptions(params: {
  organizationId?: string | null
  appId?: string | null
  limit: number
}): Promise<SubscriptionRow[]> {
  const where: Record<string, unknown> = {}
  if (params.organizationId) where.organizationId = params.organizationId
  if (params.appId) where.appId = params.appId
  // Only product apps (app_kind = product) — join filter via app relation
  const appFilter = { app: { appKind: 'product' } }
  const combinedWhere =
    Object.keys(where).length > 0 ? { AND: [where, appFilter] } : appFilter
  return prisma.subscription.findMany({
    where: combinedWhere as never,
    orderBy: { createdAt: 'desc' },
    take: params.limit,
    include: {
      app: true,
      subscriptionItems: { include: { price: { include: { product: true } } } },
    },
  }) as Promise<SubscriptionRow[]>
}

export async function provisionSubscription(params: {
  organizationId: string
  appId: string
  priceId: string | null
  status: string
}): Promise<SubscriptionRow> {
  const existing = await prisma.subscription.findFirst({
    where: { organizationId: params.organizationId, appId: params.appId },
    include: {
      app: true,
      subscriptionItems: { include: { price: { include: { product: true } } } },
    },
  })
  const now = BigInt(Math.floor(Date.now() / 1000))
  if (existing) {
    const updated = await prisma.subscription.update({
      where: { id: existing.id },
      data: { status: params.status, updatedAt: now },
      include: {
        app: true,
        subscriptionItems: {
          include: { price: { include: { product: true } } },
        },
      },
    })
    return updated as unknown as SubscriptionRow
  }
  const { generateId } = await import('@/platform/ids')
  const sub = await prisma.subscription.create({
    data: {
      id: generateId('subscription'),
      organizationId: params.organizationId,
      appId: params.appId,
      status: params.status,
      financeLifecycleVersion: 0,
      createdAt: now,
      updatedAt: now,
    },
    include: {
      app: true,
      subscriptionItems: { include: { price: { include: { product: true } } } },
    },
  })
  if (params.priceId) {
    await prisma.subscriptionItem.create({
      data: {
        id: generateId('subscriptionItem'),
        subscriptionId: sub.id,
        priceId: params.priceId,
        quantity: 1,
        createdAt: now,
        updatedAt: now,
      },
    })
    const refreshed = await prisma.subscription.findUnique({
      where: { id: sub.id },
      include: {
        app: true,
        subscriptionItems: {
          include: { price: { include: { product: true } } },
        },
      },
    })
    return refreshed as unknown as SubscriptionRow
  }
  return sub as unknown as SubscriptionRow
}

export async function updateSubscriptionById(
  subscriptionId: string,
  data: Record<string, unknown>
): Promise<SubscriptionRow | null> {
  const mapped: Record<string, unknown> = { ...data }
  if ('metadata' in mapped) {
    mapped.metadata = mapped.metadata
  }
  mapped.updatedAt = BigInt(Math.floor(Date.now() / 1000))
  // Handle metadata_ alias
  if ('metadata_' in mapped) {
    mapped.metadata = mapped['metadata_']
    delete mapped['metadata_']
  }
  try {
    const row = await prisma.subscription.update({
      where: { id: subscriptionId },
      data: mapped as never,
      include: {
        app: true,
        subscriptionItems: {
          include: { price: { include: { product: true } } },
        },
      },
    })
    return row as unknown as SubscriptionRow
  } catch {
    return null
  }
}

export async function deleteSubscriptionById(
  subscriptionId: string
): Promise<boolean> {
  const existing = await prisma.subscription.findUnique({
    where: { id: subscriptionId },
    select: { id: true },
  })
  if (!existing) return false
  const now = BigInt(Math.floor(Date.now() / 1000))
  await prisma.subscription.update({
    where: { id: subscriptionId },
    data: { status: 'canceled', updatedAt: now },
  })
  await prisma.subscription.delete({ where: { id: subscriptionId } })
  return true
}

export async function setSubscriptionPrice(
  subscriptionId: string,
  priceId: string
): Promise<void> {
  const now = BigInt(Math.floor(Date.now() / 1000))
  await prisma.subscriptionItem.deleteMany({ where: { subscriptionId } })
  const { generateId } = await import('@/platform/ids')
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

// ── Subscription Items ────────────────────────────────────────────────────────

export async function findSubscriptionItem(
  subscriptionId: string,
  itemId: string
): Promise<SubscriptionItemRow | null> {
  const row = await prisma.subscriptionItem.findFirst({
    where: { id: itemId, subscriptionId },
    include: { price: { include: { product: true } } },
  })
  return row as unknown as SubscriptionItemRow | null
}

export async function createSubscriptionItem(params: {
  subscriptionId: string
  priceId: string
  quantity: number
}): Promise<SubscriptionItemRow> {
  const now = BigInt(Math.floor(Date.now() / 1000))
  const { generateId } = await import('@/platform/ids')
  const row = await prisma.subscriptionItem.create({
    data: {
      id: generateId('subscriptionItem'),
      subscriptionId: params.subscriptionId,
      priceId: params.priceId,
      quantity: params.quantity,
      createdAt: now,
      updatedAt: now,
    },
    include: { price: { include: { product: true } } },
  })
  return row as unknown as SubscriptionItemRow
}

export async function updateSubscriptionItem(
  subscriptionId: string,
  itemId: string,
  data: { quantity?: number; priceId?: string }
): Promise<SubscriptionItemRow | null> {
  const existing = await findSubscriptionItem(subscriptionId, itemId)
  if (!existing) return null
  if (data.priceId) {
    const price = await prisma.price.findUnique({
      where: { id: data.priceId },
      select: { id: true },
    })
    if (!price) throw new Error('price/not-found')
  }
  const now = BigInt(Math.floor(Date.now() / 1000))
  const updated = await prisma.subscriptionItem.update({
    where: { id: itemId },
    data: {
      ...(data.quantity !== undefined ? { quantity: data.quantity } : {}),
      ...(data.priceId ? { priceId: data.priceId } : {}),
      updatedAt: now,
    },
    include: { price: { include: { product: true } } },
  })
  return updated as unknown as SubscriptionItemRow
}

export async function deleteSubscriptionItem(
  subscriptionId: string,
  itemId: string
): Promise<boolean> {
  const existing = await findSubscriptionItem(subscriptionId, itemId)
  if (!existing) return false
  await prisma.subscriptionItem.delete({ where: { id: itemId } })
  return true
}

// ── Outbox adapters for ported services ─────────────────────────────────────
