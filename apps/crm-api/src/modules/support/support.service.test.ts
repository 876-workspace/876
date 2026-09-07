import { getError } from '@876/core'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  categories: { list: vi.fn() },
  customers: { list: vi.fn(), create: vi.fn() },
  requests: { list: vi.fn(), create: vi.fn() },
}))

vi.mock('../categories/index.js', () => mocks.categories)
vi.mock('../customers/index.js', () => mocks.customers)
vi.mock('../requests/index.js', () => mocks.requests)

import * as service from './support.service.js'

const customer = {
  object: 'customer_profile' as const,
  profile: { id: 'crm_cus_1' },
  customer: { organizationId: 'org_source' },
}

beforeEach(() => {
  vi.resetAllMocks()
  process.env.CRM_SUPPORT_ORGANIZATION_ID = 'org_efesto'
})

afterEach(() => {
  delete process.env.CRM_SUPPORT_ORGANIZATION_ID
})

describe('platform support service', () => {
  it('fails closed when the Efesto destination is not configured', async () => {
    delete process.env.CRM_SUPPORT_ORGANIZATION_ID

    const result = await service.listRequests('org_source')

    expect(result).toEqual(getError('crm/not-configured'))
    expect(mocks.customers.list).not.toHaveBeenCalled()
  })

  it('lists only active categories from the Efesto CRM workspace', async () => {
    mocks.categories.list.mockResolvedValue([
      { id: 'cat_active', isActive: true },
      { id: 'cat_inactive', isActive: false },
    ])

    const result = await service.listCategories()

    expect(mocks.categories.list).toHaveBeenCalledWith('org_efesto')
    expect(result).toEqual([{ id: 'cat_active', isActive: true }])
  })

  it('returns an empty support history when the source organization is not a customer yet', async () => {
    mocks.customers.list.mockResolvedValue({ customers: [], hasMore: false })

    const result = await service.listRequests('org_source')

    expect(mocks.customers.list).toHaveBeenCalledWith('org_efesto', {
      customerOrganizationId: 'org_source',
    })
    expect(result).toEqual([])
    expect(mocks.requests.list).not.toHaveBeenCalled()
  })

  it('lists support history by the source organization customer, not requester user', async () => {
    mocks.customers.list.mockResolvedValue({
      customers: [customer],
      hasMore: false,
    })
    mocks.requests.list.mockResolvedValue([{ id: 'req_1' }])

    const result = await service.listRequests('org_source')

    expect(mocks.requests.list).toHaveBeenCalledWith('org_efesto', {
      customerId: 'crm_cus_1',
    })
    expect(result).toEqual([{ id: 'req_1' }])
  })

  it('reuses the existing source organization customer when creating a request', async () => {
    mocks.customers.list.mockResolvedValue({
      customers: [customer],
      hasMore: false,
    })
    mocks.requests.create.mockResolvedValue({ id: 'req_1' })

    await service.createRequest({
      sourceOrganizationId: 'org_source',
      sourceOrganizationName: 'Source Org',
      requesterUserId: 'usr_requester',
      subject: 'Need help',
      description: null,
      categoryId: null,
    })

    expect(mocks.customers.create).not.toHaveBeenCalled()
    expect(mocks.requests.create).toHaveBeenCalledWith('org_efesto', {
      customerId: 'crm_cus_1',
      subject: 'Need help',
      description: null,
      categoryId: null,
      channel: 'WIDGET',
      requesterUserId: 'usr_requester',
      createdBy: 'usr_requester',
    })
  })

  it('creates one business customer linked to the source organization when needed', async () => {
    mocks.customers.list.mockResolvedValue({ customers: [], hasMore: false })
    mocks.customers.create.mockResolvedValue(customer)
    mocks.requests.create.mockResolvedValue({ id: 'req_1' })

    await service.createRequest({
      sourceOrganizationId: 'org_source',
      sourceOrganizationName: 'Source Org',
      requesterUserId: 'usr_requester',
      subject: 'Need help',
    })

    expect(mocks.customers.create).toHaveBeenCalledWith('org_efesto', {
      idempotencyKey: 'platform-support:org_source',
      customerKind: 'BUSINESS',
      organizationId: 'org_source',
      companyName: 'Source Org',
    })
  })
})
