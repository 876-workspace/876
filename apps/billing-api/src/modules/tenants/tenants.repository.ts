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
   * provisioning path, which is delivered by a machine and knows no user; an
   * organization owner still resolves owner access from the `owner` role.
   */
  ownerUserId?: string | null
  now: number
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
 * Idempotent on `organizationId`: an existing workspace is returned untouched.
 */
export async function provisionTenantWorkspace(
  tx: TenantProvisioningClient,
  input: TenantProvisioningInput
) {
  const existing = await tx.tenant.findUnique({
    where: { organizationId: input.organizationId },
  })
  if (existing)
    return {
      id: existing.id,
      created: false,
      provisioningVersion: existing.provisioningVersion,
    }

  const tenantId = generateId('Tenant')
  const ownerRoleId = generateId('Role')
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
  await tx.role.create({
    data: {
      id: ownerRoleId,
      tenantId,
      slug: 'owner',
      name: 'Owner',
      description:
        'Unrestricted workspace access, including roles and member grants.',
      permissions: OWNER_PERMISSIONS,
      isSystem: true,
      isDefault: false,
      createdAt: input.now,
      updatedAt: input.now,
    },
  })
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
