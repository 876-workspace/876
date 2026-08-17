import { prisma } from '@/db/client'
import type { Prisma } from '@/db'
import { generateId } from '@/platform/ids'

/** Every permission a workspace owner holds. */
const OWNER_PERMISSIONS = [
  'billing:access',
  'dashboard:read',
  'customers:read',
  'customers:write',
  'catalog:read',
  'catalog:write',
  'sales:read',
  'sales:write',
  'subscriptions:read',
  'subscriptions:write',
  'reports:read',
  'settings:read',
  'currencies:read',
  'currencies:write',
  'taxes:read',
  'taxes:write',
  'members:read',
  'members:write',
  'roles:read',
  'roles:write',
  'vendors:read',
  'vendors:write',
  'purchases:read',
  'purchases:write',
  'banking:read',
  'banking:write',
  'payments:read',
  'payments:write',
]

/**
 * The system roles every workspace is seeded with.
 *
 * `resolveMemberAccess` maps an 876 organization role onto one of these slugs
 * for an account with no member row, so an organization's admins and members
 * have no Billing access at all unless `admin` and `viewer` exist. Only `owner`
 * used to be created, which is why every non-owner was locked out.
 */
const SYSTEM_ROLES = [
  {
    slug: 'owner',
    name: 'Owner',
    description:
      'Unrestricted workspace access, including roles and member grants.',
    permissions: OWNER_PERMISSIONS,
  },
  {
    slug: 'admin',
    name: 'Admin',
    description:
      'Full workspace access except editing roles, which stays with the owner.',
    permissions: OWNER_PERMISSIONS.filter(
      (permission) => permission !== 'roles:write'
    ),
  },
  {
    slug: 'viewer',
    name: 'Viewer',
    description: 'Read-only access to the workspace.',
    permissions: OWNER_PERMISSIONS.filter(
      (permission) =>
        permission === 'billing:access' || permission.endsWith(':read')
    ),
  },
] as const

/** The workspace shape every provisioning path produces. */
const WORKSPACE_PROVISIONING_VERSION = 3

/**
 * Picks a free workspace slug derived from the requested one.
 *
 * `Tenant.slug` is globally unique while an organization slug is only unique
 * among *live* organizations, so a deleted organization leaves its workspace
 * behind holding that slug. The next organization to reuse the slug then fails
 * to provision with a unique-constraint error that no retry can ever clear —
 * which is exactly how an organization ended up entitled to 876 Invoice with no
 * Billing workspace behind it. Deriving a free slug instead keeps provisioning
 * a one-way door: it always produces a workspace.
 */
async function availableSlug(
  tx: TenantProvisioningClient,
  requested: string,
  organizationId: string
): Promise<string> {
  const base = requested.slice(0, 60)
  const candidates = [
    requested,
    `${base}-${organizationId.slice(-6)}`,
    ...Array.from({ length: 25 }, (_, index) => `${base}-${index + 2}`),
  ]

  for (const candidate of candidates) {
    const taken = await tx.tenant.findUnique({
      where: { slug: candidate },
      select: { id: true },
    })
    if (!taken) return candidate
  }

  // Deterministic candidates are exhausted only under a pathological amount of
  // collision; a generated id is always free.
  return `${base}-${generateId('Tenant').slice(-12)}`
}

type TenantProvisioningClient = Prisma.TransactionClient

export type TenantProvisioningInput = {
  organizationId: string
  name: string
  slug: string
  countryCode?: string | null
  defaultCurrency: string
  defaultLanguage?: string
  /**
   * The 876 account to seat as the workspace owner. Omitted by the finance
   * provisioning path, which is delivered by a machine and knows no user.
   */
  ownerUserId?: string | null
  now: number
}

/**
 * Seats the explicit Billing owner when an existing workspace is upgraded from
 * shared-finance-only usage to the full 876 Billing product.
 *
 * Finance provisioning knows the organization but not the acting user, so it
 * intentionally creates no Member row. A later Billing setup supplies that
 * user and must not return early merely because the shared tenant already
 * exists. The system-role migration/backfill normally guarantees `owner`, but
 * creating it here as well keeps this path self-healing for legacy bare tenants.
 */
async function ensureOwnerMembership(
  tx: TenantProvisioningClient,
  tenantId: string,
  userId: string,
  now: number
) {
  let ownerRole = await tx.role.findFirst({
    where: { tenantId, slug: 'owner' },
    select: { id: true },
  })
  if (!ownerRole) {
    ownerRole = await tx.role.create({
      data: {
        id: generateId('Role'),
        tenantId,
        slug: 'owner',
        name: 'Owner',
        description:
          'Unrestricted workspace access, including roles and member grants.',
        permissions: OWNER_PERMISSIONS,
        isSystem: true,
        isDefault: false,
        createdAt: now,
        updatedAt: now,
      },
      select: { id: true },
    })
  }

  const member = await tx.member.findFirst({
    where: { tenantId, userId },
    select: { id: true, roleId: true, status: true },
  })
  if (!member) {
    await tx.member.create({
      data: {
        id: generateId('Member'),
        tenantId,
        userId,
        roleId: ownerRole.id,
        status: 'ACTIVE',
        createdAt: now,
        updatedAt: now,
      },
    })
    return
  }

  if (member.roleId !== ownerRole.id || member.status !== 'ACTIVE')
    await tx.member.update({
      where: { id: member.id },
      data: { roleId: ownerRole.id, status: 'ACTIVE', updatedAt: now },
    })
}

/**
 * Creates an organization's Billing workspace — the one bootstrap every
 * provisioning path runs.
 *
 * 876 Billing's own set-up and the finance-provisioning event delivered for a
 * finance-dependent app (876 Invoice) both land here, so an organization gets
 * the same workspace whichever product it arrives through. Previously the
 * finance path wrote a bare tenant with no roles, leaving a workspace nobody
 * could administer.
 *
 * Idempotent on `organizationId`. If Billing setup supplies an owner for an
 * existing finance-created workspace, the owner grant is repaired before the
 * existing workspace is returned.
 */
export async function provisionTenantWorkspace(
  tx: TenantProvisioningClient,
  input: TenantProvisioningInput
) {
  const existing = await tx.tenant.findUnique({
    where: { organizationId: input.organizationId },
  })
  if (existing) {
    if (input.ownerUserId)
      await ensureOwnerMembership(tx, existing.id, input.ownerUserId, input.now)
    return {
      id: existing.id,
      created: false,
      provisioningVersion: existing.provisioningVersion,
    }
  }

  const tenantId = generateId('Tenant')
  const tenant = await tx.tenant.create({
    data: {
      id: tenantId,
      organizationId: input.organizationId,
      slug: await availableSlug(tx, input.slug, input.organizationId),
      name: input.name,
      countryCode: input.countryCode ?? 'JM',
      status: 'ACTIVE',
      defaultCurrency: input.defaultCurrency,
      defaultLanguage: input.defaultLanguage ?? 'en',
      provisioningVersion: WORKSPACE_PROVISIONING_VERSION,
      provisionedAt: input.now,
      createdAt: input.now,
      updatedAt: input.now,
    },
  })
  await tx.tenantCurrency.create({
    data: {
      tenantId,
      currencyCode: input.defaultCurrency,
      isDefault: true,
      isEnabled: true,
      createdAt: input.now,
      updatedAt: input.now,
    },
  })
  let ownerRoleId = ''
  for (const role of SYSTEM_ROLES) {
    const id = generateId('Role')
    if (role.slug === 'owner') ownerRoleId = id
    await tx.role.create({
      data: {
        id,
        tenantId,
        slug: role.slug,
        name: role.name,
        description: role.description,
        permissions: [...role.permissions],
        isSystem: true,
        isDefault: false,
        createdAt: input.now,
        updatedAt: input.now,
      },
    })
  }

  if (input.ownerUserId)
    await tx.member.create({
      data: {
        id: generateId('Member'),
        tenantId,
        userId: input.ownerUserId,
        roleId: ownerRoleId,
        status: 'ACTIVE',
        createdAt: input.now,
        updatedAt: input.now,
      },
    })

  return {
    id: tenant.id,
    created: true,
    provisioningVersion: tenant.provisioningVersion,
  }
}

export async function findTenantAuthorizationByOrganizationId(
  organizationId: string
) {
  return prisma.tenant.findUnique({
    where: { organizationId },
    select: { id: true, status: true },
  })
}

export function findTenantRow(id: string) {
  return prisma.tenant.findUnique({ where: { id } })
}

export function listTenantRowsByOrganizationIds(organizationIds: string[]) {
  if (organizationIds.length === 0) return Promise.resolve([])
  return prisma.tenant.findMany({
    where: { organizationId: { in: organizationIds } },
    orderBy: { createdAt: 'asc' },
  })
}

export async function activeCurrencyExists(code: string): Promise<boolean> {
  const currency = await prisma.currency.findFirst({
    where: { code, isActive: true },
    select: { code: true },
  })
  return currency !== null
}

/**
 * Suspends an organization's workspace and records why.
 *
 * The workspace is never dropped: it holds invoices, payments, and ledger
 * entries that must be retained. Suspending it is what actually revokes access,
 * because every tenant-scoped guard requires `ACTIVE`.
 */
export async function archiveTenantRowForOrganization(input: {
  organizationId: string
  deletedBy: string | null
  reason: string | null
  now: number
}) {
  const tenant = await prisma.tenant.findUnique({
    where: { organizationId: input.organizationId },
    select: { id: true, deletedAt: true },
  })
  if (!tenant) return null

  // Keep the first tombstone: a purge following a delete must not overwrite
  // when the workspace actually lost its organization.
  return prisma.tenant.update({
    where: { id: tenant.id },
    data: {
      status: 'SUSPENDED',
      deletedAt: tenant.deletedAt ?? input.now,
      deletedBy: tenant.deletedAt ? undefined : input.deletedBy,
      deletionReason: tenant.deletedAt ? undefined : input.reason,
      updatedAt: input.now,
    },
    select: { id: true, status: true, deletedAt: true },
  })
}

/** Reverses {@link archiveTenantRowForOrganization} when an organization is restored. */
export async function restoreTenantRowForOrganization(input: {
  organizationId: string
  now: number
}) {
  const tenant = await prisma.tenant.findUnique({
    where: { organizationId: input.organizationId },
    select: { id: true, deletedAt: true },
  })
  if (!tenant) return null

  // Only a workspace this path suspended is reopened. One suspended for a
  // billing or compliance reason carries no tombstone and must stay shut.
  if (tenant.deletedAt === null)
    return prisma.tenant.findUniqueOrThrow({
      where: { id: tenant.id },
      select: { id: true, status: true, deletedAt: true },
    })

  return prisma.tenant.update({
    where: { id: tenant.id },
    data: {
      status: 'ACTIVE',
      deletedAt: null,
      deletedBy: null,
      deletionReason: null,
      updatedAt: input.now,
    },
    select: { id: true, status: true, deletedAt: true },
  })
}

export async function provisionTenantRow(input: {
  organizationId: string
  userId: string
  name: string
  slug: string
  defaultCurrency: string
  now: number
}) {
  return prisma.$transaction((tx) =>
    provisionTenantWorkspace(tx, {
      organizationId: input.organizationId,
      name: input.name,
      slug: input.slug,
      defaultCurrency: input.defaultCurrency,
      ownerUserId: input.userId,
      now: input.now,
    })
  )
}
