import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  tenantAuthorizationByOrganizationId: vi.fn(),
  zohoAccessContext: vi.fn(),
  providerList: vi.fn(),
  providerRetrieve: vi.fn(),
  listReferences: vi.fn(),
  findReference: vi.fn(),
  localExists: vi.fn(),
  upsertReference: vi.fn(),
  removeReference: vi.fn(),
}))

vi.mock('@/modules/tenants', () => ({
  tenantAuthorizationByOrganizationId: mocks.tenantAuthorizationByOrganizationId,
}))
vi.mock('../accounting-providers.service', () => ({
  zohoAccessContext: mocks.zohoAccessContext,
}))
vi.mock('@/providers/accounting', () => ({
  accountingProvider: () => ({
    customers: {
      list: mocks.providerList,
      retrieve: mocks.providerRetrieve,
    },
    items: {
      list: mocks.providerList,
      retrieve: mocks.providerRetrieve,
    },
  }),
}))
vi.mock('../accounting-import.repository', () => ({
  listAccountingReferencesByExternalIds: mocks.listReferences,
  findAccountingReferenceByExternalId: mocks.findReference,
  localAccountingResourceExists: mocks.localExists,
}))
vi.mock('../accounting-sync.repository', () => ({
  upsertAccountingReference: mocks.upsertReference,
  removeAccountingReference: mocks.removeReference,
}))

const ORGANIZATION = 'org_1'
const TENANT = 'ten_1'
const CONNECTION = 'apcon_1'
const CONTEXT = {
  tenantId: TENANT,
  connectionId: CONNECTION,
  providerOrganizationId: 'zoho_org_1',
  apiDomain: 'https://www.zohoapis.com',
  accessToken: 'access-token',
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.tenantAuthorizationByOrganizationId.mockResolvedValue({
    id: TENANT,
    active: true,
  })
  mocks.zohoAccessContext.mockResolvedValue({
    row: { tenantId: TENANT, provider: { key: 'zoho-books' } },
    ctx: CONTEXT,
  })
  mocks.listReferences.mockResolvedValue([])
  mocks.findReference.mockResolvedValue(null)
  mocks.localExists.mockResolvedValue(true)
  mocks.upsertReference.mockResolvedValue(undefined)
  mocks.removeReference.mockResolvedValue({ count: 1 })
})

describe('accounting import preview', () => {
  it('marks provider candidates that are already adopted', async () => {
    mocks.providerList.mockResolvedValue({
      data: [
        {
          contact_id: 'zc_1',
          contact_name: 'Acme Ltd',
          company_name: 'Acme Limited',
          status: 'active',
        },
      ],
      page: 1,
      perPage: 100,
      hasMore: false,
    })
    mocks.listReferences.mockResolvedValue([
      { externalId: 'zc_1', resourceId: 'cus_1' },
    ])

    const { listAccountingImportCandidates } = await import(
      '../accounting-import.service'
    )
    const result = await listAccountingImportCandidates({
      organizationId: ORGANIZATION,
      connectionId: CONNECTION,
      resourceType: 'customer',
      page: 1,
      perPage: 100,
    })

    expect(result.data).toEqual([
      expect.objectContaining({
        externalId: 'zc_1',
        name: 'Acme Ltd',
        mappedResourceId: 'cus_1',
      }),
    ])
    expect(mocks.providerList).toHaveBeenCalledWith(CONTEXT, {
      page: 1,
      perPage: 100,
    })
  })
})

describe('accounting provider adoption', () => {
  it('verifies both resources before storing the provider reference', async () => {
    mocks.providerRetrieve.mockResolvedValue({
      contact_id: 'zc_1',
      contact_name: 'Acme Ltd',
    })

    const { adoptAccountingProviderResource } = await import(
      '../accounting-import.service'
    )
    const result = await adoptAccountingProviderResource({
      organizationId: ORGANIZATION,
      connectionId: CONNECTION,
      resourceType: 'customer',
      resourceId: 'cus_1',
      externalId: 'zc_1',
    })

    expect(mocks.localExists).toHaveBeenCalledWith(TENANT, 'customer', 'cus_1')
    expect(mocks.providerRetrieve).toHaveBeenCalledWith(CONTEXT, 'zc_1')
    expect(mocks.upsertReference).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: TENANT,
        connectionId: CONNECTION,
        resourceType: 'customer',
        resourceId: 'cus_1',
        externalId: 'zc_1',
      })
    )
    expect(result).toEqual({
      object: 'accounting-provider-adoption',
      connectionId: CONNECTION,
      resourceType: 'customer',
      resourceId: 'cus_1',
      externalId: 'zc_1',
    })
  })

  it('rejects adopting a provider object already mapped elsewhere', async () => {
    mocks.providerRetrieve.mockResolvedValue({ item_id: 'zi_1', name: 'Support' })
    mocks.findReference.mockResolvedValue({
      externalId: 'zi_1',
      resourceId: 'item_other',
    })

    const { adoptAccountingProviderResource } = await import(
      '../accounting-import.service'
    )

    await expect(
      adoptAccountingProviderResource({
        organizationId: ORGANIZATION,
        connectionId: CONNECTION,
        resourceType: 'item',
        resourceId: 'item_1',
        externalId: 'zi_1',
      })
    ).rejects.toMatchObject({
      code: 'billing/accounting-provider-resource-already-adopted',
      httpStatus: 409,
    })
    expect(mocks.upsertReference).not.toHaveBeenCalled()
  })

  it('does not expose or mutate another organization connection', async () => {
    mocks.zohoAccessContext.mockResolvedValue({
      row: { tenantId: 'ten_other', provider: { key: 'zoho-books' } },
      ctx: CONTEXT,
    })

    const { listAccountingImportCandidates } = await import(
      '../accounting-import.service'
    )

    await expect(
      listAccountingImportCandidates({
        organizationId: ORGANIZATION,
        connectionId: CONNECTION,
        resourceType: 'customer',
        page: 1,
        perPage: 100,
      })
    ).rejects.toMatchObject({
      code: 'billing/accounting-provider-connection-not-found',
      httpStatus: 404,
    })
    expect(mocks.providerList).not.toHaveBeenCalled()
  })
})
