import { beforeEach, describe, expect, it, vi } from 'vitest'

const repository = vi.hoisted(() => ({
  findAppBySlug: vi.fn(),
  findSubscription: vi.fn(),
  findDefaultPriceForApp: vi.fn(),
  ensureSubscriptionDefaultPrice: vi.fn(),
  provisionSubscription: vi.fn(),
}))

vi.mock('../provisioning.repository', () => repository)
vi.mock('../provisioning-policy', () => ({
  enabledProvisioningApplicationSlugs: vi.fn(() => ['876-enterprise']),
  requirePersistedProvisioningPolicy: vi.fn(),
  resolveFreshProvisioningPolicy: vi.fn().mockResolvedValue(null),
  retrievePersistedProvisioningPolicy: vi.fn().mockResolvedValue(null),
}))
vi.mock('../billing-customer-sync', () => ({
  enqueueCustomerEnsureForOrganization: vi.fn(),
}))
vi.mock('../billing-customer-sync.repository', () => ({
  createBillingCustomerSyncRepository: vi.fn(() => ({})),
}))

const { ensureOrgAppSubscriptions } = await import('../provisioning')

const ORG = 'org_1'
const APP_IDS: Record<string, string> = {
  '876-enterprise': 'app_enterprise',
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(1787000000 * 1000)

  repository.findAppBySlug.mockImplementation((slug: string) =>
    Promise.resolve({ id: APP_IDS[slug], slug })
  )
  repository.findSubscription.mockImplementation(
    (_organizationId: string, appId: string) =>
      Promise.resolve({
        id: `sub_${appId}`,
        status: 'active',
        hasItems: false,
      })
  )
  repository.findDefaultPriceForApp.mockImplementation((appId: string) =>
    Promise.resolve({ id: `price_${appId}` })
  )
  repository.ensureSubscriptionDefaultPrice.mockResolvedValue(true)
  repository.provisionSubscription.mockResolvedValue({
    id: 'sub_new',
    created: true,
  })
})

describe('ensureOrgAppSubscriptions default price repair', () => {
  it('attaches the default price to active itemless subscriptions', async () => {
    const result = await ensureOrgAppSubscriptions(ORG)

    expect(result.provisioned).toEqual([])
    expect(repository.ensureSubscriptionDefaultPrice).toHaveBeenCalledTimes(1)
    for (const appId of Object.values(APP_IDS)) {
      expect(repository.ensureSubscriptionDefaultPrice).toHaveBeenCalledWith(
        expect.objectContaining({
          subscriptionId: `sub_${appId}`,
          priceId: `price_${appId}`,
          now: BigInt(1787000000),
        })
      )
    }
    expect(repository.provisionSubscription).not.toHaveBeenCalled()
  })

  it('does not touch an existing subscription that already has an item', async () => {
    repository.findSubscription.mockResolvedValue({
      id: 'sub_existing',
      status: 'active',
      hasItems: true,
    })

    await ensureOrgAppSubscriptions(ORG)

    expect(repository.findDefaultPriceForApp).not.toHaveBeenCalled()
    expect(repository.ensureSubscriptionDefaultPrice).not.toHaveBeenCalled()
  })

  it('does not attach pricing while an existing subscription is inactive', async () => {
    repository.findSubscription.mockResolvedValue({
      id: 'sub_existing',
      status: 'blocked',
      hasItems: false,
    })

    await ensureOrgAppSubscriptions(ORG)

    expect(repository.findDefaultPriceForApp).not.toHaveBeenCalled()
    expect(repository.ensureSubscriptionDefaultPrice).not.toHaveBeenCalled()
  })

  it('leaves an itemless subscription unchanged when no default price exists', async () => {
    repository.findDefaultPriceForApp.mockResolvedValue(null)

    await ensureOrgAppSubscriptions(ORG)

    expect(repository.ensureSubscriptionDefaultPrice).not.toHaveBeenCalled()
  })
})
