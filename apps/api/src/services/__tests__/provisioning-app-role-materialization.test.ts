import { beforeEach, describe, expect, it, vi } from 'vitest'

const { prisma } = vi.hoisted(() => ({
  prisma: {
    organizationRole: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    appRole: { findFirst: vi.fn() },
    app: { findFirst: vi.fn() },
    subscription: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
    subscriptionItem: { create: vi.fn() },
    price: { findFirst: vi.fn() },
    orgContact: { findMany: vi.fn(), create: vi.fn() },
    appAssignment: { upsert: vi.fn() },
    membership: { update: vi.fn(), findMany: vi.fn() },
    organization: { findUnique: vi.fn() },
    user: { findUnique: vi.fn() },
    billingCustomerOutbox: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}))
vi.mock('@/db/client', () => ({
  prisma,
  disconnectDb: vi.fn(),
  pingDb: vi.fn(),
}))

const { ensureAppReady } = vi.hoisted(() => ({ ensureAppReady: vi.fn() }))
vi.mock('../finance-provisioning-readiness', () => ({ ensureAppReady }))

const { reconcileFinanceConnections, createFinanceProvisioningRepository } =
  vi.hoisted(() => ({
    reconcileFinanceConnections: vi.fn(),
    createFinanceProvisioningRepository: vi.fn(() => ({ marker: 'repo' })),
  }))
vi.mock('../finance-provisioning', () => ({ reconcileFinanceConnections }))
vi.mock('../finance-provisioning.repository', () => ({
  createFinanceProvisioningRepository,
}))

const { dispatchFinanceProvisioningOnce, ensureFinanceProvisioningDelivered } =
  vi.hoisted(() => ({
    dispatchFinanceProvisioningOnce: vi.fn(),
    ensureFinanceProvisioningDelivered: vi.fn(),
  }))
vi.mock('@/workers/finance-provisioning-dispatch', () => ({
  dispatchFinanceProvisioningOnce,
  ensureFinanceProvisioningDelivered,
}))

const { dispatchBillingCustomerSyncOnce } = vi.hoisted(() => ({
  dispatchBillingCustomerSyncOnce: vi.fn(),
}))
vi.mock('@/workers/billing-customer-dispatch', () => ({
  dispatchBillingCustomerSyncOnce,
}))

const {
  retrievePersistedProvisioningPolicy,
  resolveFreshProvisioningPolicy,
  requirePersistedProvisioningPolicy,
  enabledProvisioningApplicationSlugs,
} = vi.hoisted(() => ({
  retrievePersistedProvisioningPolicy: vi.fn(),
  resolveFreshProvisioningPolicy: vi.fn(),
  requirePersistedProvisioningPolicy: vi.fn(),
  enabledProvisioningApplicationSlugs: vi.fn(() => ['876-enterprise']),
}))
vi.mock('../provisioning-policy', () => ({
  retrievePersistedProvisioningPolicy,
  resolveFreshProvisioningPolicy,
  requirePersistedProvisioningPolicy,
  enabledProvisioningApplicationSlugs,
}))

/** The role shape the provisioning profile hands to app-access materialization. */
type SelectedProvisioningRole = {
  key: string
  name: string
  description: string | null
  permissions: string[]
  isSystem: boolean
  isDefault: boolean
  position: number
}

const {
  resolveAndPersistApplicationProvisioningProfile,
  retrieveSelectedApplicationProvisioningRoles,
  materializeProvisionedRolesForApp,
} = vi.hoisted(() => ({
  resolveAndPersistApplicationProvisioningProfile: vi.fn(),
  retrieveSelectedApplicationProvisioningRoles: vi.fn(
    async (): Promise<SelectedProvisioningRole[]> => []
  ),
  materializeProvisionedRolesForApp: vi.fn(async () => ({
    seeded: 0,
    skipped: 0,
  })),
}))
vi.mock(
  '@/modules/provisioning/application-provisioning-profile.service',
  () => ({
    resolveAndPersistApplicationProvisioningProfile,
    retrieveSelectedApplicationProvisioningRoles,
  })
)
vi.mock('@/modules/app-access', () => ({ materializeProvisionedRolesForApp }))

const { materializeRoleTemplatesForApp } = vi.hoisted(() => ({
  materializeRoleTemplatesForApp: vi.fn(),
}))
vi.mock('@/modules/app-access/app-access-role-templates.service', () => ({
  materializeRoleTemplatesForApp,
}))

const { provisionOrgApps } = await import('../provisioning')
const { materializeEntitledAppRoles } =
  await import('../app-access-provisioning')

beforeEach(() => {
  vi.clearAllMocks()
  materializeRoleTemplatesForApp.mockResolvedValue({ seeded: 2, skipped: 0 })
  retrievePersistedProvisioningPolicy.mockResolvedValue(null)
  resolveFreshProvisioningPolicy.mockResolvedValue(null)
  ensureAppReady.mockResolvedValue(undefined)
})

describe('materializeEntitledAppRoles', () => {
  it('materializes each entitled app exactly once and totals the result', async () => {
    materializeRoleTemplatesForApp
      .mockResolvedValueOnce({ seeded: 3, skipped: 0 })
      .mockResolvedValueOnce({ seeded: 0, skipped: 3 })

    const result = await materializeEntitledAppRoles({
      organizationId: 'org_2kL9mN4q',
      appIds: ['app_crm', 'app_billing'],
    })

    expect(result).toEqual({ seeded: 3, skipped: 3, failed: 0 })
    expect(materializeRoleTemplatesForApp).toHaveBeenCalledTimes(2)
    expect(materializeRoleTemplatesForApp).toHaveBeenNthCalledWith(1, {
      organizationId: 'org_2kL9mN4q',
      appId: 'app_crm',
    })
    expect(materializeRoleTemplatesForApp).toHaveBeenNthCalledWith(2, {
      organizationId: 'org_2kL9mN4q',
      appId: 'app_billing',
    })
  })

  it('deduplicates a repeated app id so roles are seeded once', async () => {
    const result = await materializeEntitledAppRoles({
      organizationId: 'org_2kL9mN4q',
      appIds: ['app_crm', 'app_crm', 'app_crm'],
    })

    expect(materializeRoleTemplatesForApp).toHaveBeenCalledTimes(1)
    expect(result).toEqual({ seeded: 2, skipped: 0, failed: 0 })
  })

  it('does nothing when the organization is entitled to no apps', async () => {
    const result = await materializeEntitledAppRoles({
      organizationId: 'org_2kL9mN4q',
      appIds: [],
    })

    expect(materializeRoleTemplatesForApp).not.toHaveBeenCalled()
    expect(result).toEqual({ seeded: 0, skipped: 0, failed: 0 })
  })

  it('records a failure and continues to the next app instead of throwing', async () => {
    materializeRoleTemplatesForApp
      .mockRejectedValueOnce(new Error('relation "app_roles" does not exist'))
      .mockResolvedValueOnce({ seeded: 4, skipped: 0 })

    const result = await materializeEntitledAppRoles({
      organizationId: 'org_2kL9mN4q',
      appIds: ['app_crm', 'app_billing'],
    })

    expect(result).toEqual({ seeded: 4, skipped: 0, failed: 1 })
    expect(materializeRoleTemplatesForApp).toHaveBeenCalledTimes(2)
  })

  it('reports every app as failed when all of them throw', async () => {
    materializeRoleTemplatesForApp.mockRejectedValue(new Error('db down'))

    const result = await materializeEntitledAppRoles({
      organizationId: 'org_2kL9mN4q',
      appIds: ['app_crm', 'app_billing'],
    })

    expect(result).toEqual({ seeded: 0, skipped: 0, failed: 2 })
  })

  it('surfaces a non-Error rejection as a failure rather than propagating it', async () => {
    materializeRoleTemplatesForApp.mockRejectedValue('boom')

    await expect(
      materializeEntitledAppRoles({
        organizationId: 'org_2kL9mN4q',
        appIds: ['app_crm'],
      })
    ).resolves.toEqual({ seeded: 0, skipped: 0, failed: 1 })
  })
})

describe('provisionOrgApps role materialization', () => {
  beforeEach(() => {
    prisma.organizationRole.findMany.mockResolvedValue([])
    prisma.organizationRole.findFirst.mockResolvedValue(null)
    prisma.app.findFirst.mockImplementation(
      ({ where }: { where: { slug: string } }) =>
        Promise.resolve({ id: `app_${where.slug}`, slug: where.slug })
    )
    prisma.subscription.findFirst.mockResolvedValue(null)
    prisma.subscription.create.mockResolvedValue({})
    prisma.price.findFirst.mockResolvedValue(null)
    prisma.organization.findUnique.mockResolvedValue(null)
  })

  it('seeds app roles for every entitled app', async () => {
    await provisionOrgApps('org_2kL9mN4q')

    expect(materializeRoleTemplatesForApp).toHaveBeenCalledWith({
      organizationId: 'org_2kL9mN4q',
      appId: 'app_876-enterprise',
    })
  })

  it('seeds roles before finance readiness runs, so a role always exists to assign', async () => {
    const order: string[] = []
    materializeRoleTemplatesForApp.mockImplementation(async () => {
      order.push('materialize')
      return { seeded: 1, skipped: 0 }
    })
    ensureAppReady.mockImplementation(async () => {
      order.push('finance')
    })

    await provisionOrgApps('org_2kL9mN4q')

    expect(order).toEqual(['materialize', 'finance'])
  })

  it('seeds templates for an organization with no persisted provisioning setup', async () => {
    retrievePersistedProvisioningPolicy.mockResolvedValue(null)

    await provisionOrgApps('org_2kL9mN4q')

    expect(materializeRoleTemplatesForApp).toHaveBeenCalled()
  })

  it('does not seed templates for an app whose manifest selected roles', async () => {
    // A published manifest is a curated selection. Seeding platform templates on
    // top would reintroduce role definitions it deliberately excluded, widening
    // what an administrator can assign.
    retrievePersistedProvisioningPolicy.mockResolvedValue({
      selection: { setup_key: 'standard' },
      policy: { applications: [] },
    })
    retrieveSelectedApplicationProvisioningRoles.mockResolvedValue([
      {
        key: 'admin',
        name: 'Admin',
        description: null,
        permissions: ['requests.view'],
        isSystem: true,
        isDefault: false,
        position: 0,
      },
    ])

    await provisionOrgApps('org_2kL9mN4q')

    expect(materializeRoleTemplatesForApp).not.toHaveBeenCalled()
  })

  it('seeds templates when a setup selected no roles for the app', async () => {
    // Regression: keying the fallback on "a setup exists" rather than on "that
    // setup actually curated roles" left every organization on a manifest that
    // names none with no assignable app role at all — so no member could hold
    // an in-app permission and every app reported no access.
    retrievePersistedProvisioningPolicy.mockResolvedValue({
      selection: { setup_key: 'standard' },
      policy: { applications: [] },
    })
    retrieveSelectedApplicationProvisioningRoles.mockResolvedValue([])

    await provisionOrgApps('org_2kL9mN4q')

    expect(materializeRoleTemplatesForApp).toHaveBeenCalledWith({
      organizationId: 'org_2kL9mN4q',
      appId: 'app_876-enterprise',
    })
  })

  it('still provisions the app when role materialization fails', async () => {
    materializeRoleTemplatesForApp.mockRejectedValue(new Error('db down'))

    const provisioned = await provisionOrgApps('org_2kL9mN4q')

    expect(provisioned).toEqual(['app_876-enterprise'])
    expect(ensureAppReady).toHaveBeenCalledTimes(1)
  })
})
