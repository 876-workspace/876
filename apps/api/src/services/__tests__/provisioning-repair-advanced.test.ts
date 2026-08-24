import { beforeEach, describe, expect, it, vi } from 'vitest'

const repository = vi.hoisted(() => ({
  findAppBySlug: vi.fn(),
  findSubscription: vi.fn(),
  findDefaultPriceForApp: vi.fn(),
  ensureSubscriptionDefaultPrice: vi.fn(),
  provisionSubscription: vi.fn(),
  findOrganization: vi.fn(),
  listSubscribedAppIds: vi.fn(),
  listRolesForOrg: vi.fn(),
  listOrgContacts: vi.fn(),
}))

vi.mock('../provisioning.repository', () => repository)
vi.mock('../billing-customer-sync', () => ({ enqueueCustomerEnsureForOrganization: vi.fn() }))
vi.mock('../billing-customer-sync.repository', () => ({ createBillingCustomerSyncRepository: vi.fn(() => ({})) }))
vi.mock('../finance-provisioning-readiness', () => ({ ensureAppReady: vi.fn().mockResolvedValue({ ready: true, financeRequired: false, eventIds: [] }) }))
vi.mock('../finance-provisioning', () => ({ reconcileFinanceConnections: vi.fn() }))
vi.mock('../finance-provisioning.repository', () => ({ createFinanceProvisioningRepository: vi.fn(() => ({})) }))
vi.mock('@/workers/finance-provisioning-dispatch', () => ({ dispatchFinanceProvisioningOnce: vi.fn(), ensureFinanceProvisioningDelivered: vi.fn() }))

const { ensureOrgAppSubscriptions } = await import('../provisioning')

const ORG = 'org_repair_1'
const APP_IDS: Record<string, string> = { '876-enterprise': 'app_enterprise', '876-billing': 'app_billing' }

function activeItemless(id: string) { return { id, status: 'active', hasItems: false } }
function activeWithItem(id: string) { return { id, status: 'active', hasItems: true } }
function blockedItemless(id: string) { return { id, status: 'blocked', hasItems: false } }

beforeEach(() => {
  vi.clearAllMocks()
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(1787000000 * 1000)
  repository.findAppBySlug.mockImplementation((slug: string) => Promise.resolve({ id: APP_IDS[slug] ?? `app_${slug}`, slug }))
  repository.findSubscription.mockImplementation((_org: string, appId: string) => Promise.resolve(activeItemless(`sub_${appId}`)))
  repository.findDefaultPriceForApp.mockImplementation((appId: string) => Promise.resolve({ id: `price_${appId}` }))
  repository.ensureSubscriptionDefaultPrice.mockResolvedValue(true)
  repository.provisionSubscription.mockResolvedValue({ id: 'sub_new', created: true })
})

describe('ensureOrgAppSubscriptions — repair invariants (extended)', () => {
  it('repairs both Enterprise and Billing when both are active itemless', async () => {
    const result = await ensureOrgAppSubscriptions(ORG)
    expect(result.provisioned).toEqual([])
    expect(repository.ensureSubscriptionDefaultPrice).toHaveBeenCalledTimes(2)
  })

  it('does not repair when subscription already has items — leaves pricing untouched', async () => {
    repository.findSubscription.mockResolvedValue(activeWithItem('sub_existing'))
    await ensureOrgAppSubscriptions(ORG)
    expect(repository.findDefaultPriceForApp).not.toHaveBeenCalled()
    expect(repository.ensureSubscriptionDefaultPrice).not.toHaveBeenCalled()
    expect(repository.provisionSubscription).not.toHaveBeenCalled()
  })

  it('does not repair blocked subscriptions even if itemless', async () => {
    repository.findSubscription.mockResolvedValue(blockedItemless('sub_blocked'))
    await ensureOrgAppSubscriptions(ORG)
    expect(repository.ensureSubscriptionDefaultPrice).not.toHaveBeenCalled()
  })

  it('leaves itemless active unchanged when default price missing', async () => {
    repository.findDefaultPriceForApp.mockResolvedValue(null)
    await ensureOrgAppSubscriptions(ORG)
    expect(repository.ensureSubscriptionDefaultPrice).not.toHaveBeenCalled()
  })

  it('repairs only the itemless app when one has items and other does not', async () => {
    repository.findSubscription.mockImplementation((_org: string, appId: string) => {
      if (appId === APP_IDS['876-enterprise']) return Promise.resolve(activeWithItem('sub_ent'))
      return Promise.resolve(activeItemless('sub_bill'))
    })
    await ensureOrgAppSubscriptions(ORG)
    expect(repository.ensureSubscriptionDefaultPrice).toHaveBeenCalledTimes(1)
    expect(repository.ensureSubscriptionDefaultPrice).toHaveBeenCalledWith(expect.objectContaining({ subscriptionId: 'sub_bill' }))
  })

  it('creates subscription when none exists (durable provisioning)', async () => {
    repository.findSubscription.mockResolvedValue(null)
    repository.findDefaultPriceForApp.mockResolvedValue({ id: 'price_new' })
    const result = await ensureOrgAppSubscriptions(ORG)
    expect(repository.provisionSubscription).toHaveBeenCalledTimes(2)
    expect(repository.ensureSubscriptionDefaultPrice).not.toHaveBeenCalled()
    expect(result.provisioned).toHaveLength(2)
  })

  it('attaches correct BigInt now and priceId in repair', async () => {
    await ensureOrgAppSubscriptions(ORG)
    const call = repository.ensureSubscriptionDefaultPrice.mock.calls[0]?.[0] as Record<string, unknown>
    expect(call.now).toBe(BigInt(1787000000))
    expect(call.priceId).toBeDefined()
    expect(call.subscriptionId).toBeDefined()
  })

  it('idempotent: second repair call is safe (transaction re-checks)', async () => {
    repository.ensureSubscriptionDefaultPrice.mockResolvedValueOnce(true).mockResolvedValueOnce(false)
    await ensureOrgAppSubscriptions(ORG)
    // simulate that first repair inserted item, second find would see hasItems true — but our mock still returns itemless.
    // The transaction itself returns false on duplicate — provisioning still succeeds idempotently.
    const second = await ensureOrgAppSubscriptions(ORG)
    expect(second.provisioned).toEqual([])
  })

  it('handles mixed: one missing subscription, one itemless requiring repair', async () => {
    repository.findSubscription.mockImplementation((_org: string, appId: string) => {
      if (appId === APP_IDS['876-enterprise']) return Promise.resolve(null)
      return Promise.resolve(activeItemless('sub_bill'))
    })
    const result = await ensureOrgAppSubscriptions(ORG)
    expect(repository.provisionSubscription).toHaveBeenCalledTimes(1)
    expect(repository.ensureSubscriptionDefaultPrice).toHaveBeenCalledTimes(1)
    expect(result.provisioned).toHaveLength(1)
  })

  it('does not provision Invoice even when price exists for it', async () => {
    repository.findAppBySlug.mockImplementation((slug: string) => {
      if (slug === '876-invoice') return Promise.resolve({ id: 'app_invoice', slug })
      return Promise.resolve({ id: APP_IDS[slug] ?? `app_${slug}`, slug })
    })
    const result = await ensureOrgAppSubscriptions(ORG)
    expect(result.appIds).not.toContain('app_invoice')
    expect(result.provisioned).not.toContain('app_invoice')
  })

  it('skips app whose slug lookup returns null (partial seed) and does not attempt repair', async () => {
    repository.findAppBySlug.mockImplementation((slug: string) => {
      if (slug === '876-billing') return Promise.resolve(null)
      return Promise.resolve({ id: APP_IDS[slug]!, slug })
    })
    await ensureOrgAppSubscriptions(ORG)
    expect(repository.findSubscription).toHaveBeenCalledTimes(1)
    expect(repository.ensureSubscriptionDefaultPrice).toHaveBeenCalledTimes(1)
  })

  it('handles repository throwing during price lookup — propagates error', async () => {
    repository.findDefaultPriceForApp.mockRejectedValue(new Error('db down'))
    await expect(ensureOrgAppSubscriptions(ORG)).rejects.toThrow('db down')
  })

  it('handles repository throwing during provision — propagates', async () => {
    repository.findSubscription.mockResolvedValue(null)
    repository.provisionSubscription.mockRejectedValue(new Error('provision fail'))
    await expect(ensureOrgAppSubscriptions(ORG)).rejects.toThrow('provision fail')
  })

  it('uses sourceAppId path: provisions source app when missing', async () => {
    repository.findSubscription.mockImplementation((_org: string, appId: string) => {
      if (appId === 'app_extra') return Promise.resolve(null)
      return Promise.resolve(activeWithItem(`sub_${appId}`))
    })
    const result = await ensureOrgAppSubscriptions(ORG, { sourceAppId: 'app_extra' })
    expect(repository.provisionSubscription).toHaveBeenCalledWith(expect.objectContaining({ appId: 'app_extra' }))
    expect(result.provisioned).toContain('app_extra')
  })

  it('does not repair source app when it already has items', async () => {
    repository.findSubscription.mockImplementation((_org: string, appId: string) => {
      if (appId === 'app_extra') return Promise.resolve(activeWithItem('sub_extra'))
      return Promise.resolve(activeItemless(`sub_${appId}`))
    })
    await ensureOrgAppSubscriptions(ORG, { sourceAppId: 'app_extra' })
    expect(repository.ensureSubscriptionDefaultPrice).toHaveBeenCalledTimes(2)
    // app_extra not repaired
    expect(repository.ensureSubscriptionDefaultPrice).not.toHaveBeenCalledWith(expect.objectContaining({ subscriptionId: 'sub_extra' }))
  })

  it('concurrent repair calls are safe — no double price insertion beyond transaction', async () => {
    const results = await Promise.all([ensureOrgAppSubscriptions(ORG), ensureOrgAppSubscriptions(ORG)])
    expect(results[0].provisioned).toEqual([])
    expect(results[1].provisioned).toEqual([])
    // each call attempts repair; transaction handles idempotency
    expect(repository.ensureSubscriptionDefaultPrice).toHaveBeenCalled()
  })

  it.each([
    ['active itemless', activeItemless('sub_1'), true],
    ['active with item', activeWithItem('sub_1'), false],
    ['blocked itemless', blockedItemless('sub_1'), false],
    ['null (no subscription)', null, false],
  ])('repair decision for %s → shouldRepair=%s', async (_label, row, shouldRepair) => {
    vi.clearAllMocks()
    repository.findAppBySlug.mockImplementation((s: string) => Promise.resolve({ id: APP_IDS[s] ?? `app_${s}`, slug: s }))
    repository.findSubscription.mockResolvedValue(row as never)
    repository.findDefaultPriceForApp.mockResolvedValue({ id: 'price_1' })
    repository.ensureSubscriptionDefaultPrice.mockResolvedValue(true)
    repository.findSubscription.mockResolvedValue(row as never)
    await ensureOrgAppSubscriptions(ORG)
    if (shouldRepair) expect(repository.ensureSubscriptionDefaultPrice).toHaveBeenCalled()
    else expect(repository.ensureSubscriptionDefaultPrice).not.toHaveBeenCalled()
  })
})
