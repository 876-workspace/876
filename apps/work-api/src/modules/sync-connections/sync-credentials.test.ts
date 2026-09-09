import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  seal: vi.fn(),
  unseal: vi.fn(),
  retrieve: vi.fn(),
  store: vi.fn(),
}))

vi.mock('../../platform/secure-field.js', () => ({
  syncCredentialContext: vi.fn((value) => ({
    tenant_id: value.tenantId,
    work_sync_connection_id: value.connectionId,
    provider: value.provider,
    type: 'calendar_sync_credential',
  })),
  getSyncSecureFieldProvider: vi.fn(() => ({
    provider: 'test',
    seal: mocks.seal,
    unseal: mocks.unseal,
  })),
}))
vi.mock('../../providers/workos/vault.js', () => ({
  getVaultClient: vi.fn(() => null),
}))
vi.mock('./sync-credentials.repository.js', () => ({
  retrieve: mocks.retrieve,
  store: mocks.store,
}))

import * as credentials from './sync-credentials.js'

const connection = {
  id: 'sync_google_1',
  tenantId: 'work_tnt_1',
  provider: 'GOOGLE',
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.seal.mockResolvedValue({
    ciphertext: 'sealed-value',
    keyId: 'key-1',
    provider: 'test',
  })
  mocks.store.mockResolvedValue({ id: 'synccred_1' })
})

describe('sync credentials', () => {
  it('seals an OAuth refresh token and stores only sealed material', async () => {
    const result = await credentials.storeOauth(connection, 'refresh-secret')

    expect(mocks.seal).toHaveBeenCalledTimes(1)
    expect(mocks.seal).toHaveBeenCalledWith(
      JSON.stringify({
        version: 1,
        kind: 'oauth',
        refreshToken: 'refresh-secret',
      }),
      {
        tenant_id: 'work_tnt_1',
        work_sync_connection_id: 'sync_google_1',
        provider: 'GOOGLE',
        type: 'calendar_sync_credential',
      }
    )
    expect(mocks.store).toHaveBeenCalledTimes(1)
    expect(mocks.store).toHaveBeenCalledWith({
      connectionId: 'sync_google_1',
      sealedSecret: 'sealed-value',
      keyId: 'key-1',
      vaultProvider: 'test',
    })
    expect(result).toEqual({ id: 'synccred_1' })
  })

  it('seals CalDAV username and password together', async () => {
    await credentials.storeCaldav(
      { ...connection, id: 'sync_caldav_1', provider: 'CALDAV' },
      { username: 'raheem', password: 'calendar-secret' }
    )

    expect(mocks.seal).toHaveBeenCalledTimes(1)
    expect(mocks.seal).toHaveBeenCalledWith(
      JSON.stringify({
        version: 1,
        kind: 'caldav',
        username: 'raheem',
        password: 'calendar-secret',
      }),
      expect.objectContaining({
        work_sync_connection_id: 'sync_caldav_1',
        provider: 'CALDAV',
      })
    )
    expect(mocks.store).toHaveBeenCalledTimes(1)
  })

  it('resolves an OAuth credential without exposing sealed storage metadata', async () => {
    mocks.retrieve.mockResolvedValue({
      id: 'synccred_1',
      sealedSecret: 'sealed-value',
      keyId: 'key-1',
      vaultProvider: 'test',
      connection,
    })
    mocks.unseal.mockResolvedValue(
      JSON.stringify({
        version: 1,
        kind: 'oauth',
        refreshToken: 'refresh-secret',
      })
    )

    const result = await credentials.resolve('synccred_1')

    expect(mocks.unseal).toHaveBeenCalledTimes(1)
    expect(result).toEqual({ refreshToken: 'refresh-secret' })
  })

  it('resolves CalDAV basic-auth credentials', async () => {
    mocks.retrieve.mockResolvedValue({
      id: 'synccred_2',
      sealedSecret: 'sealed-value',
      keyId: null,
      vaultProvider: 'test',
      connection: { ...connection, provider: 'CALDAV' },
    })
    mocks.unseal.mockResolvedValue(
      JSON.stringify({
        version: 1,
        kind: 'caldav',
        username: 'raheem',
        password: 'calendar-secret',
      })
    )

    const result = await credentials.resolve('synccred_2')

    expect(result).toEqual({ username: 'raheem', password: 'calendar-secret' })
  })

  it('returns null without attempting to decrypt an unknown credential reference', async () => {
    mocks.retrieve.mockResolvedValue(null)

    const result = await credentials.resolve('missing')

    expect(result).toBeNull()
    expect(mocks.unseal).not.toHaveBeenCalled()
  })
})
