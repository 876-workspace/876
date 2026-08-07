import { beforeEach, describe, expect, it, vi } from 'vitest'

const { prisma } = vi.hoisted(() => ({
  prisma: {
    organizationRole: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    app: { findFirst: vi.fn() },
    subscription: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
    subscriptionItem: { create: vi.fn() },
    price: { findFirst: vi.fn() },
    orgContact: { findMany: vi.fn(), create: vi.fn() },
    appAssignment: { upsert: vi.fn() },
    membership: { update: vi.fn() },
    organization: { findUnique: vi.fn() },
  },
}))

vi.mock('@/db/client', () => ({
  prisma,
  disconnectDb: vi.fn(),
  pingDb: vi.fn(),
}))

const {
  assignMemberApps,
  ensureDefaultContact,
  linkMembershipRole,
  provisionOrganization,
  provisionOrgApps,
  resolveMemberPermissions,
  seedDefaultRoles,
} = await import('../provisioning')
const { DEFAULT_ORG_ROLES, defaultPermissionsForRoleName } =
  await import('@/platform/permissions')

const ORG = 'org_1'
const NOW = 1785000000

beforeEach(() => {
  vi.clearAllMocks()
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(NOW * 1000)

  prisma.organizationRole.findMany.mockResolvedValue([])
  prisma.organizationRole.findFirst.mockResolvedValue(null)
  prisma.organizationRole.create.mockImplementation(
    ({ data }: { data: Record<string, unknown> }) =>
      Promise.resolve({ ...data, description: data.description ?? null })
  )
  prisma.app.findFirst.mockImplementation(
    ({ where }: { where: { slug: string } }) =>
      Promise.resolve({ id: `app_${where.slug}`, slug: where.slug })
  )
  prisma.subscription.findFirst.mockResolvedValue(null)
  prisma.subscription.create.mockResolvedValue({})
  prisma.subscription.update.mockResolvedValue({})
  prisma.subscriptionItem.create.mockResolvedValue({})
  prisma.price.findFirst.mockResolvedValue({ id: 'prc_1' })
  prisma.orgContact.findMany.mockResolvedValue([])
  prisma.orgContact.create.mockResolvedValue({})
  prisma.appAssignment.upsert.mockResolvedValue({})
  prisma.membership.update.mockResolvedValue({})
  prisma.organization.findUnique.mockResolvedValue({ id: ORG })
})

describe('seedDefaultRoles', () => {
  it('creates every default role and returns them keyed by name', async () => {
    const roles = await seedDefaultRoles(ORG, NOW)

    expect(Object.keys(roles).sort()).toEqual(
      DEFAULT_ORG_ROLES.map((role) => role.name).sort()
    )
    expect(prisma.organizationRole.create).toHaveBeenCalledTimes(
      DEFAULT_ORG_ROLES.length
    )
  })

  it('keeps an existing role rather than overwriting it', async () => {
    // An org that customised a system role's permissions must not have that
    // silently reverted by a re-seed.
    prisma.organizationRole.findMany.mockResolvedValue([
      {
        id: 'rol_custom',
        name: 'owner',
        displayName: 'Owner',
        description: null,
        permissions: ['custom:permission'],
        isSystem: true,
      },
    ])

    const roles = await seedDefaultRoles(ORG, NOW)

    expect(roles.owner?.permissions).toEqual(['custom:permission'])
    expect(prisma.organizationRole.create).toHaveBeenCalledTimes(
      DEFAULT_ORG_ROLES.length - 1
    )
  })

  it('marks seeded roles as system roles', async () => {
    await seedDefaultRoles(ORG, NOW)

    const data = prisma.organizationRole.create.mock.calls[0]?.[0]
      .data as Record<string, unknown>
    expect(data.isSystem).toBe(true)
    expect(data.createdAt).toBe(BigInt(NOW))
  })
})

describe('provisionOrgApps', () => {
  it('subscribes the org to Enterprise and Billing', async () => {
    const provisioned = await provisionOrgApps(ORG)

    expect(provisioned).toEqual(['app_876-enterprise', 'app_876-billing'])
    expect(prisma.subscription.create).toHaveBeenCalledTimes(2)
  })

  it('additionally subscribes the app the signup came through', async () => {
    // A courier company registering through Couriers should land in Couriers,
    // not be told it has no subscription.
    const provisioned = await provisionOrgApps(ORG, {
      sourceAppId: 'app_couriers',
    })

    expect(provisioned).toContain('app_couriers')
  })

  it('does not duplicate the source app when it is already a default', async () => {
    const provisioned = await provisionOrgApps(ORG, {
      sourceAppId: 'app_876-billing',
    })

    expect(provisioned).toEqual(['app_876-enterprise', 'app_876-billing'])
  })

  it('skips an app the org is already subscribed to', async () => {
    prisma.subscription.findFirst.mockResolvedValue({
      id: 'sub_1',
      status: 'active',
    })

    const provisioned = await provisionOrgApps(ORG)

    expect(provisioned).toEqual([])
    expect(prisma.subscription.create).not.toHaveBeenCalled()
  })

  it('attaches the default price as a line item', async () => {
    await provisionOrgApps(ORG)

    expect(prisma.subscriptionItem.create).toHaveBeenCalledTimes(2)
    const data = prisma.subscriptionItem.create.mock.calls[0]?.[0]
      .data as Record<string, unknown>
    expect(data.priceId).toBe('prc_1')
    expect(data.quantity).toBe(1)
  })

  it('subscribes without an item when the app has no default price', async () => {
    prisma.price.findFirst.mockResolvedValue(null)

    const provisioned = await provisionOrgApps(ORG)

    expect(provisioned).toHaveLength(2)
    expect(prisma.subscriptionItem.create).not.toHaveBeenCalled()
  })

  it('does not fail provisioning when a default app row is missing', async () => {
    // A partially seeded environment is worth shouting about, but it is not a
    // reason to fail somebody's signup.
    prisma.app.findFirst.mockImplementation(
      ({ where }: { where: { slug: string } }) =>
        Promise.resolve(
          where.slug === '876-billing'
            ? null
            : { id: `app_${where.slug}`, slug: where.slug }
        )
    )

    const provisioned = await provisionOrgApps(ORG)

    expect(provisioned).toEqual(['app_876-enterprise'])
  })
})

describe('provisionOrganization', () => {
  it('seeds roles, subscribes apps, and notifies the billing registry', async () => {
    const enqueue = vi.fn().mockResolvedValue(undefined)

    const roles = await provisionOrganization(ORG, NOW, {
      enqueueCustomerEnsure: enqueue,
    })

    expect(Object.keys(roles).length).toBe(DEFAULT_ORG_ROLES.length)
    expect(prisma.subscription.create).toHaveBeenCalledTimes(2)
    expect(enqueue).toHaveBeenCalledWith(ORG, NOW)
  })

  it('does not notify the registry when the organization is gone', async () => {
    prisma.organization.findUnique.mockResolvedValue(null)
    const enqueue = vi.fn().mockResolvedValue(undefined)

    await provisionOrganization(ORG, NOW, { enqueueCustomerEnsure: enqueue })

    expect(enqueue).not.toHaveBeenCalled()
  })

  it('works without a registry hook wired in', async () => {
    await expect(provisionOrganization(ORG, NOW)).resolves.toBeDefined()
  })
})

describe('ensureDefaultContact', () => {
  const USER = {
    id: 'user_1',
    firstName: 'Alejandra',
    lastName: 'Reyes',
    email: 'alejandra@example.com',
    phone: null,
  }

  it('seeds the owner as the primary contact', async () => {
    await ensureDefaultContact(ORG, USER, NOW)

    const data = prisma.orgContact.create.mock.calls[0]?.[0].data as Record<
      string,
      unknown
    >
    expect(data.isPrimary).toBe(true)
    expect(data.userId).toBe('user_1')
    expect(data.email).toBe('alejandra@example.com')
  })

  it('does nothing once the org already has a contact', async () => {
    prisma.orgContact.findMany.mockResolvedValue([{ id: 'ctc_1' }])

    await ensureDefaultContact(ORG, USER, NOW)

    expect(prisma.orgContact.create).not.toHaveBeenCalled()
  })
})

describe('resolveMemberPermissions', () => {
  it('prefers the linked organization role', async () => {
    prisma.organizationRole.findFirst.mockResolvedValue({
      id: 'rol_1',
      name: 'owner',
      displayName: 'Owner',
      description: null,
      permissions: ['members:read'],
      isSystem: true,
    })

    const permissions = await resolveMemberPermissions({
      roleId: 'rol_1',
      organizationId: ORG,
      role: 'owner',
    })

    expect([...permissions]).toEqual(['members:read'])
  })

  it('falls back to the code default when the membership is unlinked', async () => {
    const permissions = await resolveMemberPermissions({
      roleId: null,
      organizationId: ORG,
      role: 'member',
    })

    expect([...permissions].sort()).toEqual(
      defaultPermissionsForRoleName('member').sort()
    )
  })

  it('falls back when the linked role row no longer exists', async () => {
    // A deleted role must degrade to the documented default, not to no
    // permissions at all.
    prisma.organizationRole.findFirst.mockResolvedValue(null)

    const permissions = await resolveMemberPermissions({
      roleId: 'rol_gone',
      organizationId: ORG,
      role: 'member',
    })

    expect(permissions.size).toBeGreaterThan(0)
  })

  it('scopes the role lookup to the membership organization', async () => {
    // A role id from another org must never resolve.
    await resolveMemberPermissions({
      roleId: 'rol_1',
      organizationId: ORG,
      role: 'member',
    })

    expect(prisma.organizationRole.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'rol_1', organizationId: ORG },
      })
    )
  })
})

describe('linkMembershipRole', () => {
  it('points the membership at the matching org role', async () => {
    prisma.organizationRole.findFirst.mockResolvedValue({
      id: 'rol_owner',
      name: 'owner',
      displayName: 'Owner',
      description: null,
      permissions: [],
      isSystem: true,
    })

    await linkMembershipRole(
      { id: 'mem_1', organizationId: ORG, role: 'owner', roleId: null },
      NOW
    )

    expect(prisma.membership.update).toHaveBeenCalledWith({
      where: { id: 'mem_1' },
      data: { roleId: 'rol_owner', updatedAt: BigInt(NOW) },
    })
  })

  it('writes nothing when the link is already correct', async () => {
    prisma.organizationRole.findFirst.mockResolvedValue({
      id: 'rol_owner',
      name: 'owner',
      displayName: 'Owner',
      description: null,
      permissions: [],
      isSystem: true,
    })

    await linkMembershipRole(
      { id: 'mem_1', organizationId: ORG, role: 'owner', roleId: 'rol_owner' },
      NOW
    )

    expect(prisma.membership.update).not.toHaveBeenCalled()
  })

  it('clears the link when the org has no such role', async () => {
    await linkMembershipRole(
      { id: 'mem_1', organizationId: ORG, role: 'ghost', roleId: 'rol_old' },
      NOW
    )

    expect(prisma.membership.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { roleId: null, updatedAt: BigInt(NOW) },
      })
    )
  })
})

describe('assignMemberApps', () => {
  it('assigns the Enterprise directory app', async () => {
    await assignMemberApps({ organizationId: ORG, userId: 'user_1', now: NOW })

    expect(prisma.appAssignment.upsert).toHaveBeenCalledTimes(1)
    const call = prisma.appAssignment.upsert.mock.calls[0]?.[0] as Record<
      string,
      Record<string, unknown>
    >
    expect(call.create?.appId).toBe('app_876-enterprise')
  })

  it('additionally assigns the source app', async () => {
    await assignMemberApps({
      organizationId: ORG,
      userId: 'user_1',
      now: NOW,
      sourceAppId: 'app_couriers',
    })

    expect(prisma.appAssignment.upsert).toHaveBeenCalledTimes(2)
  })

  it('does not assign the source app twice when it is Enterprise', async () => {
    await assignMemberApps({
      organizationId: ORG,
      userId: 'user_1',
      now: NOW,
      sourceAppId: 'app_876-enterprise',
    })

    expect(prisma.appAssignment.upsert).toHaveBeenCalledTimes(1)
  })

  it('re-activates a revoked assignment rather than duplicating it', async () => {
    await assignMemberApps({ organizationId: ORG, userId: 'user_1', now: NOW })

    const call = prisma.appAssignment.upsert.mock.calls[0]?.[0] as Record<
      string,
      Record<string, unknown>
    >
    expect(call.update?.status).toBe('active')
  })
})
