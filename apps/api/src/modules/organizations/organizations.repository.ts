import { Prisma } from '@/db'
import { prisma } from '@/db/client'
import { paginateByCursor } from '@/http/envelope'
import { generateId } from '@/platform/ids'

/**
 * A nullable Json column is cleared with `Prisma.DbNull`, never `null` —
 * `null` is not assignable to a nullable Json input.
 */
function toJsonInput(
  value: unknown
): Prisma.InputJsonValue | typeof Prisma.DbNull {
  return value === null || value === undefined
    ? Prisma.DbNull
    : (value as Prisma.InputJsonValue)
}

import {
  ORGANIZATION_SELECT,
  type OrganizationRow,
} from './organizations.serializers'
import type { SubscriptionRow } from './organizations.serializers'

export type { OrganizationRow, SubscriptionRow }

export async function findOrganizationById(
  id: string,
  includeDeleted = false
): Promise<OrganizationRow | null> {
  const row = await prisma.organization.findUnique({
    where: { id },
    select: ORGANIZATION_SELECT,
  })
  if (!row) return null
  if (!includeDeleted && row.deletedAt !== null) return null
  return row as unknown as OrganizationRow
}

export async function findOrganizationBySlug(
  slug: string,
  includeDeleted = false
): Promise<OrganizationRow | null> {
  const row = await prisma.organization.findUnique({
    where: { slug },
    select: ORGANIZATION_SELECT,
  })
  if (!row) return null
  if (!includeDeleted && row.deletedAt !== null) return null
  return row as unknown as OrganizationRow
}

export async function findOrganizationByWorkosId(
  workosId: string
): Promise<OrganizationRow | null> {
  const row = await prisma.organization.findUnique({
    where: { workosOrganizationId: workosId },
    select: ORGANIZATION_SELECT,
  })
  return row as unknown as OrganizationRow | null
}

export async function listOrganizations(options: {
  limit: number
  starting_after?: string
  ending_before?: string
  includeDeleted: boolean
  status?: string | null
  search?: string | null
}): Promise<{ data: OrganizationRow[]; hasMore: boolean }> {
  if (options.search) {
    const rows = await prisma.organization.findMany({
      where: {
        ...(options.status ? { status: options.status } : {}),
        ...(options.includeDeleted ? {} : { deletedAt: null }),
        OR: [
          { name: { contains: options.search, mode: 'insensitive' } },
          { slug: { contains: options.search, mode: 'insensitive' } },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: options.limit,
      select: ORGANIZATION_SELECT,
    })
    return { data: rows as unknown as OrganizationRow[], hasMore: false }
  }

  const result = await paginateByCursor<OrganizationRow>({
    query: {
      limit: options.limit,
      starting_after: options.starting_after,
      ending_before: options.ending_before,
    },
    loadAnchor: async (id) =>
      (await findOrganizationById(
        id,
        true
      )) as unknown as OrganizationRow | null,
    cursorOf: (row) => row.createdAt,
    fetch: async ({ take, cursor, order }) => {
      const where: Record<string, unknown> = {
        ...(options.status ? { status: options.status } : {}),
        ...(options.includeDeleted ? {} : { deletedAt: null }),
        ...(cursor
          ? {
              createdAt:
                cursor.direction === 'lt'
                  ? { lt: cursor.value }
                  : { gt: cursor.value },
            }
          : {}),
      }
      const rows = await prisma.organization.findMany({
        where: where as never,
        orderBy: { createdAt: order },
        take,
        select: ORGANIZATION_SELECT,
      })
      return rows as unknown as OrganizationRow[]
    },
  })

  return result
}

export async function searchOrganizations(options: {
  query: string
  limit: number
  status?: string | null
}): Promise<OrganizationRow[]> {
  const rows = await prisma.organization.findMany({
    where: {
      ...(options.status ? { status: options.status } : {}),
      deletedAt: null,
      OR: [
        { name: { contains: options.query, mode: 'insensitive' } },
        { slug: { contains: options.query, mode: 'insensitive' } },
      ],
    },
    orderBy: { createdAt: 'desc' },
    take: options.limit,
    select: ORGANIZATION_SELECT,
  })
  return rows as unknown as OrganizationRow[]
}

export async function createOrganization(data: {
  id: string
  workosOrganizationId: string | null
  name: string | null
  shortName: string | null
  doingBusinessAs: string | null
  slug: string
  status: string
  industry: string | null
  businessType: string | null
  registrationNumber: string | null
  trn: string | null
  nisNumber: string | null
  gctNumber: string | null
  taxId: string | null
  incorporationDate: string | null
  primaryPhone: string | null
  primaryEmail: string | null
  fax: string | null
  websiteUrl: string | null
  supportUrl: string | null
  primaryContactUserId: string | null
  timezone: string | null
  language: string | null
  addressLine1: string | null
  addressLine2: string | null
  city: string | null
  regionId: string | null
  countryCode: string | null
  currencyCode: string | null
  metadata: unknown | null
  createdAt: bigint
  updatedAt: bigint
}): Promise<OrganizationRow> {
  const row = await prisma.organization.create({
    data: {
      id: data.id,
      workosOrganizationId: data.workosOrganizationId,
      name: data.name,
      shortName: data.shortName,
      doingBusinessAs: data.doingBusinessAs,
      slug: data.slug,
      status: data.status,
      industry: data.industry,
      businessType: data.businessType,
      registrationNumber: data.registrationNumber,
      trn: data.trn,
      nisNumber: data.nisNumber,
      gctNumber: data.gctNumber,
      taxId: data.taxId,
      incorporationDate: data.incorporationDate,
      primaryPhone: data.primaryPhone,
      primaryEmail: data.primaryEmail,
      fax: data.fax,
      websiteUrl: data.websiteUrl,
      supportUrl: data.supportUrl,
      primaryContactUserId: data.primaryContactUserId,
      timezone: data.timezone,
      language: data.language,
      addressLine1: data.addressLine1,
      addressLine2: data.addressLine2,
      city: data.city,
      regionId: data.regionId,
      countryCode: data.countryCode,
      currencyCode: data.currencyCode,
      metadata: toJsonInput(data.metadata),
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    },
    select: ORGANIZATION_SELECT,
  })
  return row as unknown as OrganizationRow
}

export async function updateOrganization(
  id: string,
  data: Record<string, unknown>
): Promise<OrganizationRow | null> {
  try {
    const {
      metadata: _meta,
      metadata_,
      ...rest
    } = data as Record<string, unknown> & {
      metadata?: unknown
      metadata_?: unknown
    }
    const updateData: Record<string, unknown> = { ...rest }
    if ('metadata' in data || 'metadata_' in data) {
      const value = (_meta ?? metadata_) as unknown
      updateData.metadata =
        value === null ? Prisma.DbNull : (value as Prisma.InputJsonValue)
    }
    if (
      'countryCode' in updateData &&
      typeof updateData.countryCode === 'string'
    ) {
      updateData.countryCode = (updateData.countryCode as string).toUpperCase()
    }
    if (
      'currencyCode' in updateData &&
      typeof updateData.currencyCode === 'string'
    ) {
      updateData.currencyCode = (
        updateData.currencyCode as string
      ).toUpperCase()
    }
    const row = await prisma.organization.update({
      where: { id },
      data: updateData as never,
      select: ORGANIZATION_SELECT,
    })
    return row as unknown as OrganizationRow
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2025'
    )
      return null
    throw error
  }
}

export async function deleteOrganization(
  id: string,
  deletedBy: string | null,
  reason: string | null
): Promise<OrganizationRow | null> {
  try {
    const now = BigInt(Math.floor(Date.now() / 1000))
    const row = await prisma.organization.update({
      where: { id },
      data: {
        deletedAt: now,
        deletedBy,
        deletionReason: reason,
        updatedAt: now,
      },
      select: ORGANIZATION_SELECT,
    })
    return row as unknown as OrganizationRow
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2025'
    )
      return null
    throw error
  }
}

export async function purgeOrganization(id: string): Promise<boolean> {
  try {
    await prisma.organization.delete({ where: { id } })
    return true
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2025'
    )
      return false
    throw error
  }
}

export async function countMembershipsForOrg(
  organizationId: string
): Promise<number> {
  return prisma.membership.count({ where: { organizationId } })
}

export async function findMembershipByOrgAndUser(
  organizationId: string,
  userId: string
): Promise<{
  id: string
  role: string
  status: string
  roleId: string | null
  organizationId: string
} | null> {
  const row = await prisma.membership.findFirst({
    where: { organizationId, userId },
    select: {
      id: true,
      role: true,
      status: true,
      roleId: true,
      organizationId: true,
    },
  })
  return row
}

export async function findUserById(
  userId: string
): Promise<{ id: string; workosUserId: string } | null> {
  const row = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, workosUserId: true },
  })
  return row
}

export async function findAppById(
  appId: string
): Promise<{ id: string; slug: string | null; name: string | null } | null> {
  const row = await prisma.app.findUnique({
    where: { id: appId },
    select: { id: true, slug: true, name: true },
  })
  return row as { id: string; slug: string | null; name: string | null } | null
}

export async function findAppBySlug(
  slug: string
): Promise<{ id: string; slug: string } | null> {
  const row = await prisma.app.findUnique({
    where: { slug },
    select: { id: true, slug: true },
  })
  return row
}

export async function findDefaultPriceForApp(
  appId: string
): Promise<{ id: string } | null> {
  const row = await prisma.price.findFirst({
    where: { productId: appId },
    select: { id: true },
  })
  return row
}

export async function getSubscription(
  organizationId: string,
  appId: string
): Promise<SubscriptionRow | null> {
  const row = await prisma.subscription.findFirst({
    where: { organizationId, appId },
    include: {
      app: { select: { slug: true, name: true, logoUrl: true, appKind: true } },
      subscriptionItems: { include: { price: { include: { product: true } } } },
    },
  })
  return row as unknown as SubscriptionRow | null
}

export async function getSubscriptionByAppSlug(
  organizationId: string,
  appSlug: string
): Promise<SubscriptionRow | null> {
  const row = await prisma.subscription.findFirst({
    where: { organizationId, app: { slug: appSlug } },
    include: {
      app: { select: { slug: true, name: true, logoUrl: true, appKind: true } },
      subscriptionItems: { include: { price: { include: { product: true } } } },
    },
  })
  return row as unknown as SubscriptionRow | null
}

export async function listSubscriptionsByOrg(
  organizationId: string
): Promise<SubscriptionRow[]> {
  const rows = await prisma.subscription.findMany({
    where: { organizationId },
    include: {
      app: { select: { slug: true, name: true, logoUrl: true, appKind: true } },
      subscriptionItems: { include: { price: { include: { product: true } } } },
    },
  })
  return rows as unknown as SubscriptionRow[]
}

export async function listSubscriptionsByOrgs(
  organizationIds: string[],
  appKind?: string
): Promise<SubscriptionRow[]> {
  if (organizationIds.length === 0) return []
  const rows = await prisma.subscription.findMany({
    where: {
      organizationId: { in: organizationIds },
      ...(appKind ? { app: { appKind } } : {}),
    },
    include: {
      app: { select: { slug: true, name: true, logoUrl: true, appKind: true } },
      subscriptionItems: { include: { price: { include: { product: true } } } },
    },
  })
  return rows as unknown as SubscriptionRow[]
}

export async function provisionSubscription(params: {
  organizationId: string
  appId: string
  priceId: string | null
  now: bigint
}): Promise<SubscriptionRow> {
  const existing = await prisma.subscription.findFirst({
    where: { organizationId: params.organizationId, appId: params.appId },
  })
  if (existing) {
    const updated = await prisma.subscription.update({
      where: { id: existing.id },
      data: { status: 'active', updatedAt: params.now },
      include: {
        app: {
          select: { slug: true, name: true, logoUrl: true, appKind: true },
        },
        subscriptionItems: {
          include: { price: { include: { product: true } } },
        },
      },
    })
    return updated as unknown as SubscriptionRow
  }
  const id = `sub_${Math.random().toString(36).slice(2, 14)}`
  const itemId = `sbi_${Math.random().toString(36).slice(2, 14)}`
  // The relations are connected rather than set as scalars: assigning
  // `organizationId`/`appId` directly selects Prisma's *unchecked* create
  // input, which forbids the nested `subscriptionItems.create` below. The
  // alternative — two writes — is what risks an orphan item row.
  const created = await prisma.subscription.create({
    data: {
      id,
      organization: { connect: { id: params.organizationId } },
      app: { connect: { id: params.appId } },
      status: 'active',
      financeLifecycleVersion: 1,
      createdAt: params.now,
      updatedAt: params.now,
      subscriptionItems: params.priceId
        ? {
            create: {
              id: itemId,
              price: { connect: { id: params.priceId } },
              quantity: 1,
              createdAt: params.now,
              updatedAt: params.now,
            },
          }
        : undefined,
    },
    include: {
      app: { select: { slug: true, name: true, logoUrl: true, appKind: true } },
      subscriptionItems: { include: { price: { include: { product: true } } } },
    },
  })
  return created as unknown as SubscriptionRow
}

export async function updateSubscription(
  organizationId: string,
  appId: string,
  updates: { status?: string; cancelAtPeriodEnd?: boolean; canceledAt?: bigint }
): Promise<SubscriptionRow | null> {
  const existing = await prisma.subscription.findFirst({
    where: { organizationId, appId },
  })
  if (!existing) return null
  const data: Record<string, unknown> = {}
  if (updates.status !== undefined) data.status = updates.status
  if (updates.cancelAtPeriodEnd !== undefined)
    data.cancelAtPeriodEnd = updates.cancelAtPeriodEnd
  if (updates.canceledAt !== undefined) data.canceledAt = updates.canceledAt
  data.updatedAt = BigInt(Math.floor(Date.now() / 1000))
  const row = await prisma.subscription.update({
    where: { id: existing.id },
    data: data as never,
    include: {
      app: { select: { slug: true, name: true, logoUrl: true, appKind: true } },
      subscriptionItems: { include: { price: { include: { product: true } } } },
    },
  })
  return row as unknown as SubscriptionRow
}

/**
 * Point a subscription at a price.
 *
 * The existing items are **replaced**, not updated in place — the Python
 * deletes every item and inserts a fresh one, so the new item carries a new id
 * and new timestamps. Updating in place would leave `created_at` reading as the
 * moment the *previous* price was attached.
 */
export async function setSubscriptionPrice(
  subscriptionId: string,
  priceId: string,
  now: number
): Promise<void> {
  const timestamp = BigInt(now)

  await prisma.$transaction([
    prisma.subscriptionItem.deleteMany({ where: { subscriptionId } }),
    prisma.subscriptionItem.create({
      data: {
        id: generateId('subscriptionItem'),
        subscription: { connect: { id: subscriptionId } },
        price: { connect: { id: priceId } },
        quantity: 1,
        createdAt: timestamp,
        updatedAt: timestamp,
      },
    }),
  ])
}

// Invite helpers

export async function listInvitesByOrg(
  organizationId: string,
  options: { limit: number; starting_after?: string; ending_before?: string }
): Promise<{ data: InviteTokenRow[]; hasMore: boolean }> {
  const take = options.limit + 1
  if (options.starting_after) {
    const anchor = await prisma.inviteToken.findUnique({
      where: { id: options.starting_after },
    })
    if (!anchor) return { data: [], hasMore: false }
    const rows = await prisma.inviteToken.findMany({
      where: { organizationId, createdAt: { lt: anchor.createdAt } },
      orderBy: { createdAt: 'desc' },
      take,
    })
    const hasMore = rows.length > options.limit
    return {
      data: rows.slice(0, options.limit) as unknown as InviteTokenRow[],
      hasMore,
    }
  }
  if (options.ending_before) {
    const anchor = await prisma.inviteToken.findUnique({
      where: { id: options.ending_before },
    })
    if (!anchor) return { data: [], hasMore: false }
    const rows = await prisma.inviteToken.findMany({
      where: { organizationId, createdAt: { gt: anchor.createdAt } },
      orderBy: { createdAt: 'asc' },
      take,
    })
    const slice = rows.slice(0, options.limit).reverse()
    return {
      data: slice as unknown as InviteTokenRow[],
      hasMore: rows.length > options.limit,
    }
  }
  const rows = await prisma.inviteToken.findMany({
    where: { organizationId },
    orderBy: { createdAt: 'desc' },
    take,
  })
  return {
    data: rows.slice(0, options.limit) as unknown as InviteTokenRow[],
    hasMore: rows.length > options.limit,
  }
}

type InviteTokenRow = {
  id: string
  organizationId: string
  email: string
  role: string
  status: string
  expiresAt: bigint
  sourceAppId: string | null
  createdAt: bigint
}

export async function findInviteById(
  inviteId: string
): Promise<InviteTokenRow | null> {
  const row = await prisma.inviteToken.findUnique({ where: { id: inviteId } })
  return row as unknown as InviteTokenRow | null
}

export async function findInviteByToken(
  token: string
): Promise<InviteTokenRow | null> {
  const row = await prisma.inviteToken.findUnique({ where: { token } })
  return row as unknown as InviteTokenRow | null
}

export async function createInvite(data: {
  id: string
  organizationId: string
  email: string
  role: string
  sourceAppId: string | null
  token: string
  status: string
  expiresAt: bigint
  createdAt: bigint
  updatedAt: bigint
}): Promise<InviteTokenRow> {
  const row = await prisma.inviteToken.create({
    data: {
      id: data.id,
      organizationId: data.organizationId,
      email: data.email,
      role: data.role,
      sourceAppId: data.sourceAppId,
      token: data.token,
      status: data.status,
      expiresAt: data.expiresAt,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    },
  })
  return row as unknown as InviteTokenRow
}

export async function updateInvite(
  inviteId: string,
  data: { status?: string; updatedAt?: bigint }
): Promise<InviteTokenRow | null> {
  try {
    const row = await prisma.inviteToken.update({
      where: { id: inviteId },
      data: data as never,
    })
    return row as unknown as InviteTokenRow
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2025'
    )
      return null
    throw error
  }
}

export async function listMembershipsForOrg(
  organizationId: string,
  options: { limit: number; starting_after?: string; ending_before?: string }
): Promise<{
  data: Array<{
    id: string
    organizationId: string
    userId: string
    role: string
    status: string
    createdAt: bigint
    updatedAt: bigint
  }>
  hasMore: boolean
}> {
  const take = options.limit + 1
  if (options.starting_after) {
    const anchor = await prisma.membership.findUnique({
      where: { id: options.starting_after },
    })
    if (!anchor) return { data: [], hasMore: false }
    const rows = await prisma.membership.findMany({
      where: { organizationId, createdAt: { lt: anchor.createdAt } },
      orderBy: { createdAt: 'desc' },
      take,
    })
    return {
      data: rows.slice(0, options.limit) as never,
      hasMore: rows.length > options.limit,
    }
  }
  if (options.ending_before) {
    const anchor = await prisma.membership.findUnique({
      where: { id: options.ending_before },
    })
    if (!anchor) return { data: [], hasMore: false }
    const rows = await prisma.membership.findMany({
      where: { organizationId, createdAt: { gt: anchor.createdAt } },
      orderBy: { createdAt: 'asc' },
      take,
    })
    return {
      data: rows.slice(0, options.limit).reverse() as never,
      hasMore: rows.length > options.limit,
    }
  }
  const rows = await prisma.membership.findMany({
    where: { organizationId },
    orderBy: { createdAt: 'desc' },
    take,
  })
  return {
    data: rows.slice(0, options.limit) as never,
    hasMore: rows.length > options.limit,
  }
}

// ---------------------------------------------------------------------------
// Membership and user reads/writes for the org's own membership routes
//
// Kept here rather than in the service: `pnpm node:boundaries` fails on a
// service that imports the Prisma client.
// ---------------------------------------------------------------------------

/** The invite-acceptance path needs the email to match against the invite. */
export function findUserForInvite(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, workosUserId: true },
  })
}

export function findMembershipForUser(organizationId: string, userId: string) {
  return prisma.membership.findFirst({ where: { organizationId, userId } })
}

export function createMembership(data: {
  id: string
  organizationId: string
  userId: string
  workosMembershipId: string | null
  role: string
  status: string
  createdAt: bigint
  updatedAt: bigint
}) {
  return prisma.membership.create({ data })
}

export function activateMembership(
  membershipId: string,
  data: {
    role: string
    workosMembershipId: string | null
    updatedAt: bigint
  }
) {
  return prisma.membership.update({
    where: { id: membershipId },
    data: { status: 'active', ...data },
  })
}
