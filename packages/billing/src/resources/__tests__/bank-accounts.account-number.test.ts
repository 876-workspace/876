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

describe('bankAccounts.accountNumber', () => {
  it('retrieves the disclosed account number from the escaped account path', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      Response.json({
        data: {
          object: 'bank_account_number',
          accountId: 'ba/1',
          accountNumber: '0604551234',
          accountNumberLast4: '1234',
        },
        error: null,
      })
    )

    const result = await client(fetchMock).bankAccounts.accountNumber.retrieve(
      'ba/1'
    )

    expect(result).toEqual({
      data: {
        object: 'bank_account_number',
        accountId: 'ba/1',
        accountNumber: '0604551234',
        accountNumberLast4: '1234',
      },
      error: null,
    })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]
    expect(String(url)).toBe(
      `${BASE}/api/v1/banking/accounts/ba%2F1/account-number`
    )
    expect(init.method).toBe('GET')
  })

  it('rejects a response that is not an account-number resource', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      Response.json({
        data: { object: 'bank_account', id: 'ba_1' },
        error: null,
      })
    )

    const result = await client(fetchMock).bankAccounts.accountNumber.retrieve(
      'ba_1'
    )

    expect(result.data).toBeNull()
    expect(result.error).not.toBeNull()
  })

  it('passes a server error through as a value', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      Response.json(
        {
          data: null,
          error: {
            code: 'bank_account/number-not-on-file',
            message: 'This bank account has no account number on file.',
          },
        },
        { status: 404 }
      )
    )

    const result = await client(fetchMock).bankAccounts.accountNumber.retrieve(
      'ba_1'
    )

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('bank_account/number-not-on-file')
  })
})
