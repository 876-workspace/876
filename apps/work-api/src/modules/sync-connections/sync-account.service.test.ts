import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  retrieveConnection: vi.fn(),
  updateConnection: vi.fn(),
  findCalendarByRemote: vi.fn(),
  listCalendarStates: vi.fn(),
  retrieveState: vi.fn(),
  removeState: vi.fn(),
  buildOauthAuthorizeUrl: vi.fn(),
  exchangeOauthCode: vi.fn(),
  retrieveRemoteAccount: vi.fn(),
  link: vi.fn(),
  providerForConnection: vi.fn(),
  storeCaldav: vi.fn(),
  storeOauth: vi.fn(),
  retrieveById: vi.fn(),
  setOauthState: vi.fn(),
  consumeOauthState: vi.fn(),
  repositoryUpdate: vi.fn(),
}))

vi.mock('../sync-mappings/index.js', () => ({
  findCalendarByRemote: mocks.findCalendarByRemote,
  listCalendarStates: mocks.listCalendarStates,
  retrieveState: mocks.retrieveState,
  removeState: mocks.removeState,
}))
vi.mock('../../providers/sync/index.js', () => ({
  buildOauthAuthorizeUrl: mocks.buildOauthAuthorizeUrl,
  exchangeOauthCode: mocks.exchangeOauthCode,
  retrieveRemoteAccount: mocks.retrieveRemoteAccount,
}))
vi.mock('./sync-calendar-link.repository.js', () => ({ link: mocks.link }))
vi.mock('./sync-provider.js', () => ({
  providerForConnection: mocks.providerForConnection,
}))
vi.mock('./sync-credentials.js', () => ({
  storeCaldav: mocks.storeCaldav,
  storeOauth: mocks.storeOauth,
}))
vi.mock('./sync-connections.repository.js', () => ({
  retrieveById: mocks.retrieveById,
  setOauthState: mocks.setOauthState,
  consumeOauthState: mocks.consumeOauthState,
  update: mocks.repositoryUpdate,
}))
vi.mock('./sync-connections.service.js', () => ({
  create: vi.fn(),
  retrieve: mocks.retrieveConnection,
  update: mocks.updateConnection,
}))

import * as service from './sync-account.service.js'

const CREATED_AT = new Date('2026-09-09T12:00:00.000Z')

function connection(overrides: Record<string, unknown> = {}) {
  return {
    object: 'sync_connection' as const,
    id: 'sync_1',
    organizationId: 'org_1',
    userId: 'user_1',
    provider: 'GOOGLE' as const,
    status: 'PAUSED' as const,
    credentialRef: null,
    remoteAccountId: null,
    remoteAccountLabel: null,
    caldavUrl: null,
    syncCursor: null,
    lastSyncedAt: null,
    lastErrorCode: null,
    createdAt: 1_788_955_200,
    updatedAt: 1_788_955_200,
    ...overrides,
  }
}

function rawConnection(overrides: Record<string, unknown> = {}) {
  return {
    id: 'sync_1',
    tenantId: 'tenant_1',
    userId: 'user_1',
    provider: 'GOOGLE' as const,
    status: 'PAUSED' as const,
    credentialRef: null,
    remoteAccountId: null,
    remoteAccountLabel: null,
    caldavUrl: null,
    syncCursor: null,
    lastSyncedAt: null,
    lastErrorCode: null,
    oauthStateHash: null,
    oauthStateExpiresAt: null,
    syncLeaseToken: null,
    syncLeaseExpiresAt: null,
    syncLeaseHeartbeatAt: null,
    createdAt: CREATED_AT,
    updatedAt: CREATED_AT,
    ...overrides,
  }
}

function mapping(overrides: Record<string, unknown> = {}) {
  return {
    id: 'syncmap_1',
    connectionId: 'sync_1',
    parentMappingId: null,
    resourceType: 'CALENDAR' as const,
    syncDirection: 'BIDIRECTIONAL' as const,
    localId: 'calendar_1',
    remoteId: 'remote_1',
    remoteEtag: null,
    iCalUid: null,
    contentHash: null,
    syncCursor: null,
    syncWindowStart: null,
    syncWindowEnd: null,
    lastSyncedAt: null,
    lastErrorCode: null,
    createdAt: CREATED_AT,
    updatedAt: CREATED_AT,
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.retrieveConnection.mockResolvedValue(connection())
  mocks.retrieveById.mockResolvedValue(rawConnection())
  mocks.findCalendarByRemote.mockResolvedValue(null)
  mocks.listCalendarStates.mockResolvedValue([])
  mocks.buildOauthAuthorizeUrl.mockReturnValue(
    'https://accounts.example.test/oauth?state=opaque'
  )
  mocks.exchangeOauthCode.mockResolvedValue({
    accessToken: 'access_secret',
    refreshToken: 'refresh_secret',
  })
  mocks.retrieveRemoteAccount.mockResolvedValue({
    id: 'remote_account_1',
    label: 'Calendar User',
  })
  mocks.providerForConnection.mockResolvedValue({
    provider: 'GOOGLE',
    calendars: vi.fn().mockResolvedValue([]),
  })
  mocks.consumeOauthState.mockResolvedValue(true)
  mocks.link.mockResolvedValue({ kind: 'linked', mapping: mapping() })
})

describe('sync account lifecycle', () => {
  it('rejects authorization for a connection owned by another user', async () => {
    mocks.retrieveConnection.mockResolvedValue(connection({ userId: 'user_2' }))

    const result = await service.authorize('org_1', 'sync_1', 'user_1')

    expect(result).toEqual(expect.objectContaining({ code: 'work/session-forbidden' }))
    expect(mocks.setOauthState).not.toHaveBeenCalled()
  })

  it('stores only a hashed single-use OAuth state server-side', async () => {
    const result = await service.authorize('org_1', 'sync_1', 'user_1')

    expect(result).toEqual(
      expect.objectContaining({
        object: 'sync_authorization',
        connectionId: 'sync_1',
        provider: 'GOOGLE',
      })
    )
    expect(mocks.setOauthState).toHaveBeenCalledOnce()
    const saved = mocks.setOauthState.mock.calls[0]?.[0]
    expect(saved.hash).toMatch(/^[a-f0-9]{64}$/)
    expect(saved.hash).not.toContain('sync_1.')
    expect(saved.expiresAt).toBeInstanceOf(Date)
  })

  it('consumes OAuth state once and rejects a replay before token exchange', async () => {
    mocks.consumeOauthState
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false)

    const first = await service.completeOauth({
      provider: 'GOOGLE',
      state: 'sync_1.nonce_value',
      code: 'code_1',
    })
    const replay = await service.completeOauth({
      provider: 'GOOGLE',
      state: 'sync_1.nonce_value',
      code: 'code_2',
    })

    expect(first).toEqual({
      object: 'sync_oauth_complete',
      connectionId: 'sync_1',
      provider: 'GOOGLE',
    })
    expect(replay).toEqual(
      expect.objectContaining({ code: 'work/sync-oauth-invalid-state' })
    )
    expect(mocks.exchangeOauthCode).toHaveBeenCalledTimes(1)
    expect(mocks.storeOauth).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'sync_1' }),
      'refresh_secret'
    )
    expect(mocks.repositoryUpdate).toHaveBeenCalledWith(
      'sync_1',
      expect.objectContaining({
        status: 'ACTIVE',
        remoteAccountId: 'remote_account_1',
        remoteAccountLabel: 'Calendar User',
      })
    )
  })

  it('rejects expired or mismatched OAuth state without exchanging a code', async () => {
    mocks.consumeOauthState.mockResolvedValue(false)

    const result = await service.completeOauth({
      provider: 'GOOGLE',
      state: 'sync_1.expired_nonce',
      code: 'code_1',
    })

    expect(result).toEqual(
      expect.objectContaining({ code: 'work/sync-oauth-invalid-state' })
    )
    expect(mocks.exchangeOauthCode).not.toHaveBeenCalled()
    expect(mocks.storeOauth).not.toHaveBeenCalled()
  })

  it('links provider read-only calendars as pull-only mappings', async () => {
    mocks.providerForConnection.mockResolvedValue({
      provider: 'GOOGLE',
      calendars: vi.fn().mockResolvedValue([
        {
          remoteId: 'remote_read_only',
          name: 'Shared holidays',
          description: null,
          timeZone: 'America/Jamaica',
          color: null,
          readOnly: true,
        },
      ]),
    })
    mocks.link.mockResolvedValue({
      kind: 'linked',
      mapping: mapping({
        remoteId: 'remote_read_only',
        syncDirection: 'PULL_ONLY',
      }),
    })

    const result = await service.linkCalendar('org_1', 'sync_1', 'user_1', {
      remoteCalendarId: 'remote_read_only',
    })

    expect(mocks.link).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'tenant_1',
        connectionId: 'sync_1',
        userId: 'user_1',
        remoteCalendarId: 'remote_read_only',
        syncDirection: 'PULL_ONLY',
      })
    )
    expect(result).toEqual(
      expect.objectContaining({
        object: 'sync_calendar_link',
        syncDirection: 'PULL_ONLY',
      })
    )
  })

  it('passes an explicitly selected local calendar into the atomic link operation', async () => {
    mocks.providerForConnection.mockResolvedValue({
      provider: 'GOOGLE',
      calendars: vi.fn().mockResolvedValue([
        {
          remoteId: 'remote_editable',
          name: 'Operations',
          description: 'Ops calendar',
          timeZone: 'America/Jamaica',
          color: null,
          readOnly: false,
        },
      ]),
    })

    await service.linkCalendar('org_1', 'sync_1', 'user_1', {
      remoteCalendarId: 'remote_editable',
      localCalendarId: 'calendar_existing',
    })

    expect(mocks.link).toHaveBeenCalledWith(
      expect.objectContaining({
        localCalendarId: 'calendar_existing',
        remoteCalendarId: 'remote_editable',
        syncDirection: 'BIDIRECTIONAL',
      })
    )
  })

  it('rejects link discovery for another users connection before provider access', async () => {
    mocks.retrieveConnection.mockResolvedValue(connection({ userId: 'user_2' }))

    const result = await service.linkCalendar('org_1', 'sync_1', 'user_1', {
      remoteCalendarId: 'remote_1',
    })

    expect(result).toEqual(expect.objectContaining({ code: 'work/session-forbidden' }))
    expect(mocks.providerForConnection).not.toHaveBeenCalled()
    expect(mocks.link).not.toHaveBeenCalled()
  })
})
