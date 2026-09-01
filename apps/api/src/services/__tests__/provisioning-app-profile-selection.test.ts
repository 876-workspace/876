import { beforeEach, describe, expect, it, vi } from 'vitest'

const repository = vi.hoisted(() => ({
  findAppBySlug: vi.fn(),
  findSubscription: vi.fn(),
  findDefaultPriceForApp: vi.fn(),
  ensureSubscriptionDefaultPrice: vi.fn(),
  provisionSubscription: vi.fn(),
}))

const policy = vi.hoisted(() => ({
  enabledProvisioningApplicationSlugs: vi.fn(),
  requirePersistedProvisioningPolicy: vi.fn(),
  resolveFreshProvisioningPolicy: vi.fn(),
  retrievePersistedProvisioningPolicy: vi.fn(),
}))

const profile = vi.hoisted(() => ({
  resolveAndPersistApplicationProvisioningProfile: vi.fn(),
}))

vi.mock('../provisioning.repository', () => repository)
vi.mock('../provisioning-policy', () => policy)
vi.mock(
  '@/modules/provisioning/application-provisioning-profile.service',
  () => profile
)
vi.mock('../billing-customer-sync', () => ({
  enqueueCustomerEnsureForOrganization: vi.fn(),
}))
vi.mock('../billing-customer-sync.repository', () => ({
  createBillingCustomerSyncRepository: vi.fn(() => ({})),
}))
vi.mock('@/workers/billing-customer-dispatch', () => ({
  dispatchBillingCustomerSyncOnce: vi.fn(),
}))

const { ensureOrgAppSubscriptions } = await import('../provisioning')

const ORG_ID = 'org_profile_boundary'
const NOW = 1_788_163_200

function persistedPolicy() {
  return {
    selection: { setup_key: 'jamaica' },
    policy: { conditions: [], entitlements: [] },
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  policy.enabledProvisioningApplicationSlugs.mockReturnValue([
    '876-enterprise',
    '876-crm',
  ])
  policy.retrievePersistedProvisioningPolicy.mockResolvedValue(persistedPolicy())
  policy.resolveFreshProvisioningPolicy.mockResolvedValue(null)

  repository.findAppBySlug.mockImplementation((slug: string) =>
    Promise.resolve({ id: `app_${slug}`, slug })
  )
  repository.findSubscription.mockResolvedValue(null)
  repository.findDefaultPriceForApp.mockResolvedValue(null)
  repository.ensureSubscriptionDefaultPrice.mockResolvedValue(true)
  repository.provisionSubscription.mockResolvedValue({ id: 'sub_created' })
  profile.resolveAndPersistApplicationProvisioningProfile.mockResolvedValue({})
})

describe('ensureOrgAppSubscriptions application-profile boundary', () => {
  it('selects one profile for every setup-entitled app plus the explicit source app', async () => {
    const result = await ensureOrgAppSubscriptions(ORG_ID, {
      sourceAppId: 'app_couriers',
      selectionTimestamp: NOW,
    })

    expect(result.appIds).toEqual([
      'app_876-enterprise',
      'app_876-crm',
      'app_couriers',
    ])
    expect(
      profile.resolveAndPersistApplicationProvisioningProfile
    ).toHaveBeenCalledTimes(3)
    expect(
      profile.resolveAndPersistApplicationProvisioningProfile.mock.calls
    ).toEqual([
      [ORG_ID, 'app_876-enterprise', NOW],
      [ORG_ID, 'app_876-crm', NOW],
      [ORG_ID, 'app_couriers', NOW],
    ])
  })

  it('also selects profiles for already-existing subscriptions', async () => {
    repository.findSubscription.mockResolvedValue({
      id: 'sub_existing',
      status: 'active',
      hasItems: true,
    })

    const result = await ensureOrgAppSubscriptions(ORG_ID, {
      selectionTimestamp: NOW,
    })

    expect(result.provisioned).toEqual([])
    expect(repository.provisionSubscription).not.toHaveBeenCalled()
    expect(
      profile.resolveAndPersistApplicationProvisioningProfile
    ).toHaveBeenCalledTimes(2)
  })

  it('does not silently route a legacy organization with no persisted workspace setup', async () => {
    policy.retrievePersistedProvisioningPolicy.mockResolvedValue(null)
    policy.resolveFreshProvisioningPolicy.mockResolvedValue(null)

    const result = await ensureOrgAppSubscriptions(ORG_ID)

    expect(result.appIds).toEqual(['app_876-enterprise'])
    expect(repository.provisionSubscription).toHaveBeenCalledTimes(1)
    expect(
      profile.resolveAndPersistApplicationProvisioningProfile
    ).not.toHaveBeenCalled()
  })

  it('routes app profiles when a fresh workspace setup is resolved in the same provisioning call', async () => {
    policy.retrievePersistedProvisioningPolicy.mockResolvedValue(null)
    policy.resolveFreshProvisioningPolicy.mockResolvedValue(persistedPolicy())

    await ensureOrgAppSubscriptions(ORG_ID, { selectionTimestamp: NOW })

    expect(policy.resolveFreshProvisioningPolicy).toHaveBeenCalledWith(
      ORG_ID,
      NOW
    )
    expect(
      profile.resolveAndPersistApplicationProvisioningProfile
    ).toHaveBeenCalledTimes(2)
  })

  it('keeps subscription writes durable when profile selection fails afterward', async () => {
    profile.resolveAndPersistApplicationProvisioningProfile.mockRejectedValueOnce(
      new Error('profile selection unavailable')
    )

    await expect(
      ensureOrgAppSubscriptions(ORG_ID, { selectionTimestamp: NOW })
    ).rejects.toThrow('profile selection unavailable')

    expect(repository.provisionSubscription).toHaveBeenCalledTimes(2)
    const subscriptionOrder =
      repository.provisionSubscription.mock.invocationCallOrder[1]!
    const profileOrder =
      profile.resolveAndPersistApplicationProvisioningProfile.mock
        .invocationCallOrder[0]!
    expect(subscriptionOrder).toBeLessThan(profileOrder)
  })
})
