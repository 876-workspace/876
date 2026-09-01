import { createHash } from 'node:crypto'

import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  findById: vi.fn(),
  consumeState: vi.fn(),
  exchangeCode: vi.fn(),
  listOrganizations: vi.fn(),
  completeOauth: vi.fn(),
}))

vi.mock('@/config', () => ({
  getSettings: () => ({
    zohoBooks: {
      clientId: 'zoho-client',
      clientSecret: 'zoho-secret',
      redirectUri:
        'https://billing.example/api/v1/providers/zoho-books/oauth/callback',
      accountsDomain: 'https://accounts.zoho.com',
    },
  }),
}))

vi.mock('@/platform/timestamps', () => ({ nowUnixSeconds: () => 1_000 }))

vi.mock('@/platform/ids', () => ({ generateId: vi.fn(() => 'acon_new') }))

vi.mock('@/platform/secure-field', () => ({
  getSecureFieldProvider: () => ({
    seal: vi.fn(),
    unseal: vi.fn(),
  }),
}))

vi.mock('@/providers/workos/vault', () => ({ getVaultClient: () => null }))

vi.mock('@/modules/tenants', () => ({
  tenantAuthorizationByOrganizationId: vi.fn(),
}))

vi.mock('@/providers/accounting/zoho-books/oauth-internal', () => {
  class MockZohoBooksError extends Error {
    code = 'billing/provider-error'
    retryable = false
  }
  return {
    ZOHO_BOOKS_SCOPES: ['ZohoBooks.contacts.ALL'],
    ZohoBooksError: MockZohoBooksError,
    buildZohoBooksAuthorizeUrl: vi.fn(),
    exchangeZohoBooksCode: mocks.exchangeCode,
    listZohoBooksOrganizations: mocks.listOrganizations,
    normalizeZohoAccountsDomain: (value: string) => value,
    refreshZohoBooksToken: vi.fn(),
  }
})

vi.mock('../accounting-providers.repository', () => ({
  completeAccountingOauth: mocks.completeOauth,
  consumeAccountingOauthState: mocks.consumeState,
  createAccountingConnectionRow: vi.fn(),
  disableAccountingConnectionRow: vi.fn(),
  findAccountingConnectionById: mocks.findById,
  findAccountingConnectionRow: vi.fn(),
  findActiveAccountingProviderRow: vi.fn(),
  listAccountingConnectionRows: vi.fn(),
  listAccountingProviderRows: vi.fn(),
  markAccountingConnectionError: vi.fn(),
  markAccountingConnectionHealthy: vi.fn(),
  setAccountingOauthState: vi.fn(),
  updateAccountingConnectionRow: vi.fn(),
}))

import { completeZohoOauth } from '../accounting-providers.service'

function hash(nonce: string) {
  return createHash('sha256').update(nonce).digest('hex')
}

function connection(nonce = 'nonce_1', expiresAt = 1_600) {
  return {
    id: 'acon_1',
    tenantId: 'ten_1',
    providerId: 'aprov_1',
    name: 'Zoho Books',
    environment: 'live',
    status: 'pending',
    mode: 'mirror',
    providerOrganizationId: null,
    accountsDomain: 'https://accounts.zoho.com',
    apiDomain: null,
    scopes: [],
    sealedRefreshToken: null,
    refreshTokenKeyId: null,
    refreshTokenVaultProvider: null,
    oauthStateHash: hash(nonce),
    oauthStateExpiresAt: expiresAt,
    settings: null,
    lastSyncedAt: null,
    lastSuccessfulSyncAt: null,
    lastErrorCode: null,
    createdAt: 900,
    updatedAt: 900,
    provider: {
      id: 'aprov_1',
      key: 'zoho-books',
      name: 'Zoho Books',
      adapter: 'zoho-books',
      capabilities: {},
      isActive: true,
      createdAt: 900,
      updatedAt: 900,
    },
  }
}

describe('Zoho OAuth state', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.findById.mockResolvedValue(connection())
    mocks.consumeState.mockResolvedValue(true)
  })

  it('rejects a tampered state before consuming or exchanging a code', async () => {
    await expect(
      completeZohoOauth({ code: 'code_1', state: 'acon_1.tampered' })
    ).rejects.toMatchObject({ code: 'billing/oauth-invalid-state' })

    expect(mocks.consumeState).not.toHaveBeenCalled()
    expect(mocks.exchangeCode).not.toHaveBeenCalled()
  })

  it('rejects an expired state before consuming or exchanging a code', async () => {
    mocks.findById.mockResolvedValue(connection('nonce_1', 999))

    await expect(
      completeZohoOauth({ code: 'code_1', state: 'acon_1.nonce_1' })
    ).rejects.toMatchObject({ code: 'billing/oauth-invalid-state' })

    expect(mocks.consumeState).not.toHaveBeenCalled()
    expect(mocks.exchangeCode).not.toHaveBeenCalled()
  })

  it('rejects a replay when the state was already consumed', async () => {
    mocks.consumeState.mockResolvedValue(false)

    await expect(
      completeZohoOauth({ code: 'code_1', state: 'acon_1.nonce_1' })
    ).rejects.toMatchObject({ code: 'billing/oauth-invalid-state' })

    expect(mocks.consumeState).toHaveBeenCalledWith({
      id: 'acon_1',
      oauthStateHash: hash('nonce_1'),
      now: 1_000,
    })
    expect(mocks.exchangeCode).not.toHaveBeenCalled()
  })

  it('consumes valid state before making the outbound token exchange', async () => {
    mocks.exchangeCode.mockRejectedValue(new Error('provider exchange failed'))

    await expect(
      completeZohoOauth({ code: 'code_1', state: 'acon_1.nonce_1' })
    ).rejects.toThrow('provider exchange failed')

    expect(mocks.consumeState).toHaveBeenCalledTimes(1)
    expect(mocks.exchangeCode).toHaveBeenCalledTimes(1)
    // NaN when a call is missing, so an absent invocation still fails the
    // ordering assertion rather than throwing on an undefined index.
    const consumeOrder =
      mocks.consumeState.mock.invocationCallOrder[0] ?? Number.NaN
    const exchangeOrder =
      mocks.exchangeCode.mock.invocationCallOrder[0] ?? Number.NaN
    expect(consumeOrder).toBeLessThan(exchangeOrder)
  })
})
