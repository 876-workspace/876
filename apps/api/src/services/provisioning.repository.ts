import { prisma } from '@/db/client'

/** Every query organization provisioning makes. */

export type OrgRoleRow = {
  id: string
  name: string
  displayName: string
  description: string | null
  permissions: string[]
  isSystem: boolean
}

const ROLE_SELECT = {
  id: true,
  name: true,
  displayName: true,
  description: true,
  permissions: true,
  isSystem: true,
} as const

export function listRolesForOrg(organizationId: string): Promise<OrgRoleRow[]> {
  return prisma.organizationRole.findMany({
    where: { organizationId },
    // System roles first, then oldest first — a deterministic order, so two
    // roles created in the same second never swap between requests.
    orderBy: [{ isSystem: 'desc' }, { createdAt: 'asc' }],
    select: ROLE_SELECT,
  })
}

export function createRole(data: {
  id: string
  organizationId: string
  name: string
  displayName: string
  description: string | null
  permissions: string[]
  isSystem: boolean
  createdAt: bigint
  updatedAt: bigint
}): Promise<OrgRoleRow> {
  return prisma.organizationRole.create({ data, select: ROLE_SELECT })
}

export function findRoleByName(
  organizationId: string,
  name: string
): Promise<OrgRoleRow | null> {
  return prisma.organizationRole.findFirst({
    where: { organizationId, name },
    select: ROLE_SELECT,
  })
}

export function findRoleForOrg(
  roleId: string,
  organizationId: string
): Promise<OrgRoleRow | null> {
  return prisma.organizationRole.findFirst({
    where: { id: roleId, organizationId },
    select: ROLE_SELECT,
  })
}

export function findAppBySlug(
  slug: string
): Promise<{ id: string; slug: string } | null> {
  return prisma.app.findFirst({
    where: { slug },
    select: { id: true, slug: true },
  })
}

export async function findSubscription(
  organizationId: string,
  appId: string
): Promise<{ id: string; status: string; hasItems: boolean } | null> {
  const row = await prisma.subscription.findFirst({
    where: { organizationId, appId },
    select: {
      id: true,
      status: true,
      subscriptionItems: { take: 1, select: { id: true } },
    },
  })
  if (!row) return null

  // Tests and older mocked callers can omit the selected relation. Real Prisma
  // always returns it, so an omitted value is treated conservatively as
  // "already has items" rather than causing an unexpected repair write.
  return {
    id: row.id,
    status: row.status,
    hasItems: row.subscriptionItems
      ? row.subscriptionItems.length > 0
      : true,
  }
}

/**
 * Attach the current default price to an existing itemless subscription.
 *
 * This is deliberately narrower than changing a subscription's price: once an
 * item exists, provisioning leaves it untouched. The transaction re-checks the
 * invariant immediately before the repair write so ordinary retries stay
 * idempotent.
 */
export async function ensureSubscriptionDefaultPrice(params: {
  subscriptionId: string
  itemId: string
  priceId: string
  now: bigint
}): Promise<boolean> {
  return prisma.$transaction(async (tx) => {
    const existingItem = await tx.subscriptionItem.findFirst({
      where: { subscriptionId: params.subscriptionId },
      select: { id: true },
    })
    if (existingItem) return false

    await tx.subscriptionItem.create({
      data: {
        id: params.itemId,
        subscriptionId: params.subscriptionId,
        priceId: params.priceId,
        quantity: 1,
        createdAt: params.now,
        updatedAt: params.now,
      },
    })
    return true
  })
}

/**
 * The distinct app ids an organization is subscribed to.
 *
 * Used to drive the finance-readiness pass over exactly the apps that were
 * actually provisioned, so a durable-then-finance ordering can re-derive that
 * set on a retry without threading it through the caller.
 */
export async function listSubscribedAppIds(
  organizationId: string
): Promise<string[]> {
  const rows = await prisma.subscription.findMany({
    where: { organizationId },
    select: { appId: true },
    distinct: ['appId'],
  })
  return rows.map((row) => row.appId)
}

/**
 * The price a new organization subscribes to when none is named — the oldest
 * active price on the oldest active product scoped to the app.
 */
export async function findDefaultPriceForApp(
  appId: string
): Promise<{ id: string } | null> {
  const price = await prisma.price.findFirst({
    where: { status: 'active', product: { appId, status: 'active' } },
    orderBy: [{ product: { createdAt: 'asc' } }, { createdAt: 'asc' }],
    select: { id: true },
  })
  return price
}

/**
 * Create or re-activate an org's subscription to an app.
 *
 * `priceId` is attached as a line item on first creation only: re-provisioning
 * a previously blocked org must not silently change the items it already has.
 */
export async function provisionSubscription(params: {
  id: string
  itemId: string
  organizationId: string
  appId: string
  priceId: string | null
  status: string
  now: bigint
}): Promise<{ id: string; created: boolean }> {
  const existing = await findSubscription(params.organizationId, params.appId)

  if (existing) {
    await prisma.subscription.update({
      where: { id: existing.id },
      data: { status: params.status, updatedAt: params.now },
    })
    return { id: existing.id, created: false }
  }

  await prisma.subscription.create({
    data: {
      id: params.id,
      organizationId: params.organizationId,
      appId: params.appId,
      status: params.status,
      financeLifecycleVersion: 0,
      createdAt: params.now,
      updatedAt: params.now,
    },
  })

  if (params.priceId !== null)
    await prisma.subscriptionItem.create({
      data: {
        id: params.itemId,
        subscriptionId: params.id,
        priceId: params.priceId,
        quantity: 1,
        createdAt: params.now,
        updatedAt: params.now,
      },
    })

  return { id: params.id, created: true }
}

export function listOrgContacts(
  organizationId: string
): Promise<{ id: string }[]> {
  return prisma.orgContact.findMany({
    where: { organizationId },
    select: { id: true },
  })
}

export async function createOrgContact(data: {
  id: string
  organizationId: string
  userId: string
  firstName: string
  lastName: string | null
  type: string
  isPrimary: boolean
  email: string | null
  phone: string | null
  createdAt: bigint
  updatedAt: bigint
}): Promise<void> {
  await prisma.orgContact.create({ data })
}

/** Upsert an active assignment, re-activating a revoked one. */
export async function assignApp(params: {
  id: string
  organizationId: string
  userId: string
  appId: string
  assignedBy: string | null
  now: bigint
}): Promise<void> {
  await prisma.appAssignment.upsert({
    where: {
      organizationId_userId_appId: {
        organizationId: params.organizationId,
        userId: params.userId,
        appId: params.appId,
      },
    },
    create: {
      id: params.id,
      organizationId: params.organizationId,
      userId: params.userId,
      appId: params.appId,
      status: 'active',
      assignedBy: params.assignedBy,
      createdAt: params.now,
      updatedAt: params.now,
    },
    update: {
      status: 'active',
      assignedBy: params.assignedBy,
      updatedAt: params.now,
    },
  })
}

export async function updateMembershipRole(
  membershipId: string,
  roleId: string | null,
  now: bigint
): Promise<void> {
  await prisma.membership.update({
    where: { id: membershipId },
    data: { roleId, updatedAt: now },
  })
}

export function findOrganization(
  organizationId: string
): Promise<{ id: string } | null> {
  return prisma.organization.findUnique({
    where: { id: organizationId },
    select: { id: true },
  })
}

/**
 * The organization fields the Billing customer snapshot needs, for enqueuing a
 * `customer.ensure` at provisioning time. Kept beside the `{ id }` existence
 * read rather than reaching into the billing sync repo, so provisioning owns the
 * one query it issues.
 */
export function findOrganizationForCustomerEnsure(
  organizationId: string
): Promise<{
  id: string
  name: string | null
  slug: string
  doingBusinessAs: string | null
  primaryEmail: string | null
  primaryPhone: string | null
  primaryContactUserId: string | null
} | null> {
  return prisma.organization.findUnique({
    where: { id: organizationId },
    select: {
      id: true,
      name: true,
      slug: true,
      doingBusinessAs: true,
      primaryEmail: true,
      primaryPhone: true,
      primaryContactUserId: true,
    },
  })
}
