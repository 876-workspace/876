import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'

import { resetSettingsForTest } from '@/config'

import { HttpCoreDirectoryGateway } from '../client'

const fetchMock = vi.fn()

function envelope(data: unknown): Response {
  return new Response(JSON.stringify({ data, error: null }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })
}

function listEnvelope(rows: unknown[]): Response {
  return envelope({
    object: 'list',
    data: rows,
    has_more: false,
    url: '/directory/banks',
    total_count: rows.length,
  })
}

function bankRow(overrides: Record<string, unknown> = {}) {
  return {
    object: 'bank',
    id: 'bank_ncb',
    country_code: 'JM',
    name: 'National Commercial Bank',
    short_name: 'NCB',
    bank_code: '001',
    clearing_system: 'JACH',
    institution_type: 'commercial_bank',
    swift_code: 'JNCBJMKX',
    logo_url: 'https://cdn.876.test/logos/ncb.png',
    head_office: 'Kingston',
    website: 'https://example.test',
    created_at: 1785000000,
    updated_at: 1785000000,
    ...overrides,
  }
}

function branchRow(overrides: Record<string, unknown> = {}) {
  return {
    object: 'bank_branch',
    id: 'bkbr_halfwaytree',
    bank_id: 'bank_ncb',
    name: 'Half Way Tree Branch',
    transit_number: '00412',
    routing_number: '0820012',
    address_id: null,
    contact_number: null,
    operating_hours: null,
    address: null,
    created_at: 1785000000,
    updated_at: 1785000000,
    ...overrides,
  }
}

describe('HttpCoreDirectoryGateway bank identity', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('fetch', fetchMock)
    process.env.API_URL = 'https://identity.test'
    process.env.BILLING_API_876_KEY = 'resource-server-key'
    process.env.BILLING_API_KEY = ''
    process.env.API_876_KEY = ''
    process.env.IDENTITY_API_TIMEOUT_SECONDS = '1'
    resetSettingsForTest(process.env)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('parses the bank logo url from the Core payload', async () => {
    fetchMock.mockResolvedValueOnce(listEnvelope([bankRow()]))

    const [bank] = await new HttpCoreDirectoryGateway().listBanks('JM')

    expect(bank).toEqual({
      id: 'bank_ncb',
      countryCode: 'JM',
      name: 'National Commercial Bank',
      shortName: 'NCB',
      bankCode: '001',
      clearingSystem: 'JACH',
      institutionType: 'commercial_bank',
      logoUrl: 'https://cdn.876.test/logos/ncb.png',
    })
  })

  it('falls back to a null logo when Core sends no logo url', async () => {
    fetchMock.mockResolvedValueOnce(
      listEnvelope([bankRow({ logo_url: null })])
    )

    const [bank] = await new HttpCoreDirectoryGateway().listBanks('JM')

    expect(bank?.logoUrl).toBeNull()
  })

  it('sends one batched banks request carrying every id', async () => {
    fetchMock.mockResolvedValueOnce(listEnvelope([bankRow()]))

    await new HttpCoreDirectoryGateway().listBanks('JM', [
      'bank_ncb',
      'bank_scb',
    ])

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url] = fetchMock.mock.calls[0] as [string]
    expect(url).toContain('/directory/banks?')
    expect(url).toContain(`ids=${encodeURIComponent('bank_ncb,bank_scb')}`)
  })

  it('resolves branches across banks with a single ids request', async () => {
    fetchMock.mockResolvedValueOnce(listEnvelope([branchRow()]))

    const branches = await new HttpCoreDirectoryGateway().listBranchesByIds([
      'bkbr_halfwaytree',
      'bkbr_downtown',
    ])

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url] = fetchMock.mock.calls[0] as [string]
    expect(url).toBe(
      'https://identity.test/directory/bank-branches?limit=100&ids=bkbr_halfwaytree%2Cbkbr_downtown'
    )
    expect(branches).toEqual([
      {
        id: 'bkbr_halfwaytree',
        bankId: 'bank_ncb',
        name: 'Half Way Tree Branch',
        transitNumber: '00412',
        routingNumber: '0820012',
      },
    ])
  })
})
