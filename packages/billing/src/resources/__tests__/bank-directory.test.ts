import { describe, expect, it, vi } from 'vitest'

import { create876Client } from '../../client'

const BASE = 'https://billing.example.test'

function client(fetchMock: ReturnType<typeof vi.fn>) {
  return create876Client({
    baseUrl: BASE,
    organizationId: 'org_1',
    fetch: fetchMock as unknown as typeof fetch,
  })
}

function listOnce(rows: unknown[]) {
  return vi.fn().mockResolvedValue(
    Response.json({
      data: {
        object: 'list',
        data: rows,
        has_more: false,
        url: '/api/v1/banking/directory/banks',
        total_count: rows.length,
      },
      error: null,
    })
  )
}

function bankRow() {
  return {
    object: 'bank-directory-bank',
    id: 'bank_ncb',
    countryCode: 'JM',
    name: 'National Commercial Bank',
    shortName: 'NCB',
    bankCode: '001',
    clearingSystem: 'JACH',
    institutionType: 'commercial_bank',
    logoUrl: 'https://cdn.876.test/logos/ncb.png',
  }
}

function branchRow() {
  return {
    object: 'bank-directory-branch',
    id: 'bkbr_halfwaytree',
    bankId: 'bank_ncb',
    name: 'Half Way Tree Branch',
    transitNumber: '00412',
    routingNumber: '0820012',
  }
}

describe('bank directory SDK resource', () => {
  it('parses bank identity fields including the logo url', async () => {
    const fetchMock = listOnce([bankRow()])

    const result = await client(fetchMock).bankDirectory.listBanks('JM')

    expect(result.error).toBeNull()
    expect(result.data?.data[0]).toEqual(bankRow())
    expect(fetchMock).toHaveBeenCalledWith(
      `${BASE}/api/v1/banking/directory/banks?countryCode=JM`,
      expect.objectContaining({ method: 'GET' })
    )
  })

  it('sends one batched banks request carrying every id', async () => {
    const fetchMock = listOnce([bankRow()])

    const result = await client(fetchMock).bankDirectory.listBanks('JM', {
      ids: ['bank_ncb', 'bank_scb'],
    })

    expect(result.error).toBeNull()
    const [url] = fetchMock.mock.calls[0] as [string]
    expect(url).toContain('/banking/directory/banks?')
    expect(url).toContain(`ids=${encodeURIComponent('bank_ncb,bank_scb')}`)
  })

  it('resolves branches across banks with a single ids request', async () => {
    const fetchMock = listOnce([branchRow()])

    const result = await client(fetchMock).bankDirectory.listBranchesByIds([
      'bkbr_halfwaytree',
      'bkbr_downtown',
    ])

    expect(result.error).toBeNull()
    expect(result.data?.data[0]).toEqual(branchRow())
    const [url] = fetchMock.mock.calls[0] as [string]
    expect(url).toContain('/banking/directory/branches?')
    expect(url).toContain(
      `ids=${encodeURIComponent('bkbr_halfwaytree,bkbr_downtown')}`
    )
  })
})
