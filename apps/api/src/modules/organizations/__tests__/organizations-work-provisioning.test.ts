import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  findOrganizationById: vi.fn(),
  findAppById: vi.fn(),
  findAppBySlug: vi.fn(),
  findDefaultPriceForApp: vi.fn(),
  provisionSubscription: vi.fn(),
  ensureAppReady: vi.fn(),
  createFinanceProvisioningRepository: vi.fn(),
  ensureWork: vi.fn(),
}))

vi.mock('../organizations.repository', () => ({
  findOrganizationById: mocks.findOrganizationById,
  findAppById: mocks.findAppById,
  findAppBySlug: mocks.findAppBySlug,
  findDefaultPriceForApp: mocks.findDefaultPriceForApp,
  provisionSubscription: mocks.provisionSubscription,
}))
vi.mock('@/services/finance-provisioning-readiness', () => ({
  ensureAppReady: mocks.ensureAppReady,
}))
vi.mock('@/services/finance-provisioning.repository', () => ({
  createFinanceProvisioningRepository:
    mocks.createFinanceProvisioningRepository,
}))
vi.mock('@/services/workspace', () => ({
  workspace: { work: { ensure: mocks.ensureWork } },
}))

import { provisionSubscription } from '../organizations.service'

const subscriptionRow = {
  id: 'sub_1',
  billingAccountId: null,
  organizationId: 'org_1',
  appId: 'app_crm',
  app: null,
  status: 'active',
  providerStatus: null,
  statusReason: null,
  financeLifecycleVersion: 0,
  collectionMethod: null,
  billingCycleAnchor: null,
  subscriptionItems: [],
  currentPeriodStart: null,
  currentPeriodEnd: null,
  cancelAt: null,
  cancelAtPeriodEnd: false,
  canceledAt: null,
  endedAt: null,
  pauseCollection: null,
  trialStart: null,
  trialEnd: null,
  startDate: null,
  defaultPaymentMethodId: null,
  latestInvoiceId: null,
  pendingUpdate: null,
  scheduleId: null,
  metadata: null,
  createdAt: BigInt(1),
  updatedAt: BigInt(1),
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.findOrganizationById.mockResolvedValue({ id: 'org_1' })
  mocks.findAppById.mockResolvedValue({ id: 'app_crm' })
  mocks.findDefaultPriceForApp.mockResolvedValue(null)
  mocks.provisionSubscription.mockResolvedValue(subscriptionRow)
  mocks.ensureAppReady.mockResolvedValue(undefined)
  mocks.createFinanceProvisioningRepository.mockReturnValue({})
  mocks.ensureWork.mockResolvedValue(undefined)
})

describe('organization subscription Work provisioning', () => {
  it('repairs only the activated Work app after each readiness pass', async () => {
    await provisionSubscription('org_1', { app_id: 'app_crm' })
    await provisionSubscription('org_1', { app_id: 'app_crm' })

    expect(mocks.ensureAppReady).toHaveBeenCalledTimes(2)
    expect(mocks.ensureWork).toHaveBeenCalledTimes(2)
    expect(mocks.ensureWork).toHaveBeenNthCalledWith(1, {
      organizationId: 'org_1',
      appIds: ['app_crm'],
    })
    expect(mocks.ensureWork).toHaveBeenNthCalledWith(2, {
      organizationId: 'org_1',
      appIds: ['app_crm'],
    })
    expect(mocks.ensureAppReady.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.ensureWork.mock.invocationCallOrder[0]!
    )
  })
})
