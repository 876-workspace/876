import { beforeEach, describe, expect, it, vi } from 'vitest'

const repo = vi.hoisted(() => ({
  findAppBySlug: vi.fn(),
  findSubscription: vi.fn(),
  findDefaultPriceForApp: vi.fn(),
  ensureSubscriptionDefaultPrice: vi.fn(),
  provisionSubscription: vi.fn(),
  findOrganization: vi.fn(),
  listSubscribedAppIds: vi.fn(),
  listRolesForOrg: vi.fn(),
  findOrganizationForCustomerEnsure: vi.fn(),
  listOrgContacts: vi.fn(),
  createRole: vi.fn(),
  findRoleByName: vi.fn(),
  createOrgContact: vi.fn(),
}))

vi.mock('../provisioning.repository', () => repo)
vi.mock('../billing-customer-sync', () => ({
  enqueueCustomerEnsureForOrganization: vi.fn().mockResolvedValue(undefined),
}))
vi.mock('../billing-customer-sync.repository', () => ({
  createBillingCustomerSyncRepository: vi.fn(() => ({})),
}))
vi.mock('../finance-provisioning-readiness', () => ({
  ensureAppReady: vi.fn(),
}))
vi.mock('../finance-provisioning', () => ({
  reconcileFinanceConnections: vi.fn(),
}))
vi.mock('../finance-provisioning.repository', () => ({
  createFinanceProvisioningRepository: vi.fn(() => ({ marker: 'repo' })),
}))
vi.mock('@/workers/finance-provisioning-dispatch', () => ({
  dispatchFinanceProvisioningOnce: vi.fn(),
  ensureFinanceProvisioningDelivered: vi.fn(),
}))
vi.mock('@/db/client', () => ({
  prisma: {
    organizationRole: {
      findMany: vi.fn().mockResolvedValue([]),
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => ({
        ...data,
        description: data.description ?? null,
      })),
    },
  },
  disconnectDb: vi.fn(),
  pingDb: vi.fn(),
}))

const provisioning = await import('../provisioning')
const { DEFAULT_ORG_ROLES } = await import('@/platform/permissions')
const { ensureAppReady } = await import('../finance-provisioning-readiness')

const ORG = 'org_optin_1'
const NOW = 1785000000

beforeEach(() => {
  vi.clearAllMocks()
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(NOW * 1000)
  repo.findAppBySlug.mockImplementation((slug: string) =>
    Promise.resolve({ id: `app_${slug}`, slug })
  )
  repo.findSubscription.mockResolvedValue(null)
  repo.findDefaultPriceForApp.mockResolvedValue({ id: 'prc_default' })
  repo.ensureSubscriptionDefaultPrice.mockResolvedValue(true)
  repo.provisionSubscription.mockResolvedValue({ id: 'sub_new' })
  repo.findOrganization.mockResolvedValue({ id: ORG, name: 'Island Logistics' })
  repo.listSubscribedAppIds.mockResolvedValue([
    `app_${provisioning.ENTERPRISE_APP_SLUG}`,
  ])
  repo.listRolesForOrg.mockResolvedValue([])
  repo.findOrganizationForCustomerEnsure.mockResolvedValue({
    id: ORG,
    name: 'Island',
  })
  vi.mocked(ensureAppReady).mockResolvedValue({
    ready: true,
    financeRequired: false,
    eventIds: [],
  } as never)
  // also need to mock prisma findMany for seedDefaultRoles? seedDefaultRoles uses repository.listRolesForOrg, which we mocked above.
  // For prisma.organizationRole.create used in seedDefaultRoles, it goes through repository.createRole — but our repo.createRole not yet mocked; seedDefaultRoles uses repository.createRole
  // So mock it:
  repo.createRole?.mockImplementation?.(
    async (data: Record<string, unknown>) => ({ ...data })
  ) // no-op if not exist
  // Ensure repository.createRole returns correctly - we use vi.fn
  if (!repo.createRole)
    (repo as unknown as Record<string, unknown>).createRole = vi.fn()
  // Actually seedDefaultRoles uses repository.createRole if we have it, else will fail. Ensure it exists.
})

describe('billing opt-in entitlement invariants', () => {
  it('DEFAULT_ORG_APP_SLUGS has exactly one entry', () => {
    expect(provisioning.DEFAULT_ORG_APP_SLUGS).toHaveLength(1)
  })
  it('DEFAULT_ORG_APP_SLUGS contains Enterprise only', () => {
    expect([...provisioning.DEFAULT_ORG_APP_SLUGS]).toEqual([
      provisioning.ENTERPRISE_APP_SLUG,
    ])
  })
  it('BILLING_APP_SLUG is 876-billing', () => {
    expect(provisioning.BILLING_APP_SLUG).toBe('876-billing')
  })
  it('ENTERPRISE_APP_SLUG is 876-enterprise', () => {
    expect(provisioning.ENTERPRISE_APP_SLUG).toBe('876-enterprise')
  })
  it('BILLING is not a default app', () => {
    expect([...provisioning.DEFAULT_ORG_APP_SLUGS]).not.toContain(
      provisioning.BILLING_APP_SLUG
    )
  })
})

describe('provisionOrgApps — billing opt-in', () => {
  it('subscribes only Enterprise when no source app', async () => {
    const provisioned = await provisioning.provisionOrgApps(ORG)
    expect(provisioned).toEqual([`app_${provisioning.ENTERPRISE_APP_SLUG}`])
    expect(repo.provisionSubscription).toHaveBeenCalledTimes(1)
    expect(ensureAppReady).toHaveBeenCalledTimes(1)
    expect(ensureAppReady).toHaveBeenCalledWith(expect.anything(), {
      organizationId: ORG,
      appId: `app_${provisioning.ENTERPRISE_APP_SLUG}`,
    })
  })
  it('treats Billing as a regular source app, not a default', async () => {
    const provisioned = await provisioning.provisionOrgApps(ORG, {
      sourceAppId: `app_${provisioning.BILLING_APP_SLUG}`,
    })
    expect(provisioned).toEqual(
      expect.arrayContaining([
        `app_${provisioning.ENTERPRISE_APP_SLUG}`,
        `app_${provisioning.BILLING_APP_SLUG}`,
      ])
    )
    expect(repo.provisionSubscription).toHaveBeenCalledTimes(2)
    expect(ensureAppReady).toHaveBeenCalledTimes(2)
  })
  it('deduplicates source when it equals Enterprise', async () => {
    const provisioned = await provisioning.provisionOrgApps(ORG, {
      sourceAppId: `app_${provisioning.ENTERPRISE_APP_SLUG}`,
    })
    expect(provisioned).toEqual([`app_${provisioning.ENTERPRISE_APP_SLUG}`])
    expect(repo.provisionSubscription).toHaveBeenCalledTimes(1)
  })
  it('provisions a third-party source alongside Enterprise', async () => {
    const provisioned = await provisioning.provisionOrgApps(ORG, {
      sourceAppId: 'app_couriers',
    })
    expect(provisioned).toEqual([
      `app_${provisioning.ENTERPRISE_APP_SLUG}`,
      'app_couriers',
    ])
    expect(repo.provisionSubscription).toHaveBeenCalledTimes(2)
  })
  it('skips Enterprise when already subscribed, still runs readiness', async () => {
    repo.findSubscription.mockResolvedValue({
      id: 'sub_existing',
      status: 'active',
      hasItems: true,
    } as never)
    const provisioned = await provisioning.provisionOrgApps(ORG)
    expect(provisioned).toEqual([])
    expect(repo.provisionSubscription).not.toHaveBeenCalled()
    expect(ensureAppReady).toHaveBeenCalledTimes(1)
  })
  it('still provisions couriers when Enterprise already exists', async () => {
    repo.findSubscription.mockImplementation(
      async (_org: string, appId: string) => {
        if (appId === `app_${provisioning.ENTERPRISE_APP_SLUG}`)
          return { id: 'sub_e', status: 'active', hasItems: true } as never
        return null
      }
    )
    const provisioned = await provisioning.provisionOrgApps(ORG, {
      sourceAppId: 'app_couriers',
    })
    expect(provisioned).toEqual(['app_couriers'])
    expect(repo.provisionSubscription).toHaveBeenCalledTimes(1)
  })
  it('readiness is called even after idempotent no-op', async () => {
    repo.findSubscription.mockResolvedValue({
      id: 'sub_1',
      status: 'active',
      hasItems: true,
    } as never)
    await provisioning.provisionOrgApps(ORG)
    expect(ensureAppReady).toHaveBeenCalledTimes(1)
  })
  it('durability: provision written before readiness failure', async () => {
    vi.mocked(ensureAppReady).mockRejectedValueOnce(
      new Error('finance unavailable')
    )
    await expect(provisioning.provisionOrgApps(ORG)).rejects.toThrow(
      'finance unavailable'
    )
    expect(repo.provisionSubscription).toHaveBeenCalledTimes(1)
  })
  it('missing Enterprise app row yields empty provisioning, no throw', async () => {
    repo.findAppBySlug.mockResolvedValue(null)
    const provisioned = await provisioning.provisionOrgApps(ORG)
    expect(provisioned).toEqual([])
    expect(repo.provisionSubscription).not.toHaveBeenCalled()
    expect(ensureAppReady).not.toHaveBeenCalled()
  })
  it('null sourceAppId behaves like no source', async () => {
    const provisioned = await provisioning.provisionOrgApps(ORG, {
      sourceAppId: null,
    })
    expect(provisioned).toEqual([`app_${provisioning.ENTERPRISE_APP_SLUG}`])
  })
})

describe('provisionOrganization — billing opt-in independence', () => {
  it('creates Enterprise only, not Billing, during full provision', async () => {
    const enqueue = vi.fn().mockResolvedValue(undefined)
    // Need to mock repository.createRole for seed to succeed
    repo.listRolesForOrg.mockResolvedValue([])
    const mockCreate = vi.fn(async (d: unknown) => d as never)
    // Patch repo to have createRole
    ;(repo as unknown as { createRole: typeof mockCreate }).createRole =
      mockCreate
    // Use provisionOrgApps path which already mocked; just check count
    await provisioning.provisionOrganization(ORG, NOW, {
      enqueueCustomerEnsure: enqueue,
    })
    expect(repo.provisionSubscription).toHaveBeenCalledTimes(1)
  })
  it('enqueues customer.ensure even though no Billing entitlement', async () => {
    const enqueue = vi.fn().mockResolvedValue(undefined)
    await provisioning.provisionOrganization(ORG, NOW, {
      enqueueCustomerEnsure: enqueue,
    })
    expect(enqueue).toHaveBeenCalledWith(ORG, NOW)
  })
  it('when organization row missing, enqueue is skipped', async () => {
    repo.findOrganization.mockResolvedValue(null)
    const enqueue = vi.fn().mockResolvedValue(undefined)
    await provisioning.provisionOrganization(ORG, NOW, {
      enqueueCustomerEnsure: enqueue,
    })
    expect(enqueue).not.toHaveBeenCalled()
  })
  it('deferFinanceReadiness skips readiness but still creates durable rows', async () => {
    const enqueue = vi.fn().mockResolvedValue(undefined)
    await provisioning.provisionOrganization(ORG, NOW, {
      enqueueCustomerEnsure: enqueue,
      deferFinanceReadiness: true,
    })
    expect(repo.provisionSubscription).toHaveBeenCalledTimes(1)
    expect(ensureAppReady).not.toHaveBeenCalled()
  })
  it('without defer, readiness runs for durable apps', async () => {
    const enqueue = vi.fn().mockResolvedValue(undefined)
    await provisioning.provisionOrganization(ORG, NOW, {
      enqueueCustomerEnsure: enqueue,
    })
    expect(ensureAppReady).toHaveBeenCalledTimes(1)
  })
  it('provisionOrganization forwards sourceAppId into entitlements', async () => {
    const enqueue = vi.fn().mockResolvedValue(undefined)
    await provisioning.provisionOrganization(ORG, NOW, {
      sourceAppId: 'app_couriers',
      enqueueCustomerEnsure: enqueue,
    })
    expect(repo.provisionSubscription).toHaveBeenCalledTimes(2)
  })
  it('source billing as explicit opt-in via provisionOrganization', async () => {
    const enqueue = vi.fn().mockResolvedValue(undefined)
    await provisioning.provisionOrganization(ORG, NOW, {
      sourceAppId: `app_${provisioning.BILLING_APP_SLUG}`,
      enqueueCustomerEnsure: enqueue,
    })
    expect(repo.provisionSubscription).toHaveBeenCalledTimes(2)
  })
})

describe('ensureOrgAppSubscriptions — durability vs billing', () => {
  it('returns appIds always includes Enterprise, provisioned only when missing', async () => {
    const result = await provisioning.ensureOrgAppSubscriptions(ORG)
    expect(result.appIds).toEqual([`app_${provisioning.ENTERPRISE_APP_SLUG}`])
    expect(result.provisioned).toEqual([
      `app_${provisioning.ENTERPRISE_APP_SLUG}`,
    ])
  })
  it('idempotent second call returns empty provisioned but same appIds', async () => {
    repo.findSubscription.mockResolvedValue({
      id: 'sub_1',
      status: 'active',
      hasItems: true,
    } as never)
    const result = await provisioning.ensureOrgAppSubscriptions(ORG)
    expect(result.appIds).toEqual([`app_${provisioning.ENTERPRISE_APP_SLUG}`])
    expect(result.provisioned).toEqual([])
  })
})

describe('billing registry independence narrative', () => {
  it('financial registry is not gated on Billing subscription existence', async () => {
    repo.findSubscription.mockResolvedValue(null)
    const enqueue = vi.fn().mockResolvedValue(undefined)
    await provisioning.provisionOrganization(ORG, NOW, {
      enqueueCustomerEnsure: enqueue,
    })
    expect(enqueue).toHaveBeenCalledTimes(1)
  })
  it('failed finance readiness does not roll back durable Enterprise subscription', async () => {
    vi.mocked(ensureAppReady).mockRejectedValueOnce(
      new Error('provisioning/finance-workspace-unavailable')
    )
    const enqueue = vi.fn().mockResolvedValue(undefined)
    await expect(
      provisioning.provisionOrganization(ORG, NOW, {
        enqueueCustomerEnsure: enqueue,
      })
    ).rejects.toThrow('provisioning/finance-workspace-unavailable')
    expect(repo.provisionSubscription).toHaveBeenCalledTimes(1)
  })
})
