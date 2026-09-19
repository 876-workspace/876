import { beforeEach, describe, expect, it, vi } from 'vitest'

import { GET, POST } from './route'

const mocks = vi.hoisted(() => ({
  requireWorkWidgetPermission: vi.fn(),
  getWork: vi.fn(),
  list: vi.fn(),
  setup: vi.fn(),
}))

vi.mock('@/lib/auth/work-widget-access', () => ({
  requireWorkWidgetPermission: mocks.requireWorkWidgetPermission,
}))
vi.mock('@/lib/clients/work', () => ({ getWork: mocks.getWork }))

const CONNECTION = {
  object: 'sync_connection' as const,
  id: 'connection_1',
  provider: 'GOOGLE' as const,
  status: 'ACTIVE' as const,
  credentialRef: 'vault:secret_1',
  remoteAccountId: 'provider-account-id',
  remoteAccountLabel: 'calendar@example.com',
  caldavUrl: null,
  syncCursor: 'server-only-cursor',
  lastSyncedAt: null,
  lastErrorCode: null,
  createdAt: 100,
  updatedAt: 100,
}

function request(body: unknown) {
  return new Request('http://invoice.test/api/calendar-sync/connections', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('/api/calendar-sync/connections', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mocks.requireWorkWidgetPermission.mockResolvedValue({
      response: null,
      orgId: 'org_1',
      userId: 'user_1',
    })
    mocks.getWork.mockResolvedValue({
      syncConnections: {
        list: mocks.list,
        setup: mocks.setup,
      },
    })
    mocks.list.mockResolvedValue({
      data: {
        object: 'list',
        data: [CONNECTION],
        has_more: false,
        total_count: 1,
        url: '/v1/organizations/org_1/sync-connections',
      },
      error: null,
    })
    mocks.setup.mockResolvedValue({ data: CONNECTION, error: null })
  })

  it('requires calendars.view before listing external connections', async () => {
    await GET()

    expect(mocks.requireWorkWidgetPermission).toHaveBeenCalledWith(
      'calendars.view'
    )
  })

  it('requires calendars.edit before starting a connection', async () => {
    await POST(request({ provider: 'GOOGLE' }))

    expect(mocks.requireWorkWidgetPermission).toHaveBeenCalledWith(
      'calendars.edit'
    )
  })

  it('returns authorization failures before constructing the Work client', async () => {
    mocks.requireWorkWidgetPermission.mockResolvedValue({
      response: Response.json(
        {
          data: null,
          error: { code: 'auth/forbidden', message: 'Forbidden.' },
        },
        { status: 403 }
      ),
    })

    const response = await GET()

    expect(response.status).toBe(403)
    expect(mocks.getWork).not.toHaveBeenCalled()
  })

  it('projects server connections without credential, account-id, or cursor fields', async () => {
    const response = await GET()
    const payload = await response.json()
    const serialized = JSON.stringify(payload)

    expect(response.status).toBe(200)
    expect(serialized).not.toContain('credentialRef')
    expect(serialized).not.toContain('vault:secret_1')
    expect(serialized).not.toContain('remoteAccountId')
    expect(serialized).not.toContain('provider-account-id')
    expect(serialized).not.toContain('syncCursor')
    expect(serialized).not.toContain('server-only-cursor')
    expect(payload.data.data[0]).toMatchObject({
      object: 'sync_connection_summary',
      id: CONNECTION.id,
      provider: 'GOOGLE',
      authorized: true,
      remoteAccountLabel: 'calendar@example.com',
    })
  })

  it('rejects browser-owned user and credential fields before calling Work', async () => {
    const response = await POST(
      request({
        provider: 'GOOGLE',
        userId: 'user_2',
        credentialRef: 'vault:browser-secret',
      })
    )
    const payload = await response.json()

    expect(payload.error.code).toBe('work/invalid-request')
    expect(mocks.getWork).not.toHaveBeenCalled()
    expect(mocks.setup).not.toHaveBeenCalled()
  })

  it('passes only the validated provider setup input under the authorized org', async () => {
    const response = await POST(request({ provider: 'MICROSOFT' }))

    expect(response.status).toBe(201)
    expect(mocks.setup).toHaveBeenCalledWith('org_1', {
      provider: 'MICROSOFT',
    })
  })
})
