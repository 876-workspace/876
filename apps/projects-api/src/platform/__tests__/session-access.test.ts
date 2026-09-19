import { beforeEach, describe, expect, it, vi } from 'vitest'

import { resolveSessionAccess } from '../session-access.js'

const CORE = 'https://core.example'
const KEY = 'service-key'
const TOKEN = 'user-token'
const ORG = 'org_1'
const USER = 'usr_1'
const APP = 'app_projects'

function membership(overrides: Record<string, unknown> = {}) {
  return {
    object: 'app_membership',
    id: 'mbm_1',
    organization_id: ORG,
    user_id: USER,
    membership_id: 'mem_1',
    app_id: APP,
    app_slug: '876-projects',
    app_name: '876 Projects',
    status: 'active',
    assigned: true,
    entitled: true,
    app_role: null,
    permission_grants: [],
    permission_denies: [],
    effective_permissions: ['issues.view'],
    entitled_modules: ['issues'],
    title: null,
    attributes: null,
    assigned_by: null,
    assigned_at: null,
    last_access_at: null,
    revoked_at: null,
    created_at: null,
    updated_at: null,
    ...overrides,
  }
}

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response
}

const fetchImpl = vi.fn()

function deps() {
  return { coreBaseUrl: CORE, serviceKey: KEY, fetchImpl }
}

function resolve() {
  return resolveSessionAccess({ token: TOKEN, userId: USER, organizationId: ORG, deps: deps() })
}

beforeEach(() => {
  vi.clearAllMocks()
  fetchImpl.mockResolvedValue(jsonResponse(404, { data: null, error: null }))
})

describe('resolveSessionAccess', () => {
  it('returns the Core-resolved permissions for an active assignment', async () => {
    fetchImpl
      .mockResolvedValueOnce(
        jsonResponse(200, { data: { object: 'subscription', app_id: APP } })
      )
      .mockResolvedValueOnce(jsonResponse(200, { data: membership() }))

    const outcome = await resolve()
    expect(outcome).toEqual({
      status: 'ok',
      access: {
        userId: USER,
        organizationId: ORG,
        appId: APP,
        modules: ['issues'],
        permissions: ['issues.view'],
      },
    })
    expect(fetchImpl).toHaveBeenCalledWith(
      `${CORE}/organizations/${ORG}/apps/by-slug/876-projects`,
      expect.objectContaining({
        headers: expect.objectContaining({ 'X-876-API-Key': KEY }),
      })
    )
    const memberCall = fetchImpl.mock.calls[1]
    expect(memberCall[1]).toMatchObject({
      headers: expect.objectContaining({
        'X-876-API-Key': KEY,
        Authorization: `Bearer ${TOKEN}`,
      }),
    })
  })

  it('denies an organization with no Projects entitlement', async () => {
    fetchImpl.mockResolvedValueOnce(
      jsonResponse(404, { data: null, error: { code: 'x', message: 'y' } })
    )
    expect(await resolve()).toEqual({ status: 'denied' })
    expect(fetchImpl).toHaveBeenCalledTimes(1)
  })

  it('denies a revoked assignment', async () => {
    fetchImpl
      .mockResolvedValueOnce(jsonResponse(200, { data: { app_id: APP } }))
      .mockResolvedValueOnce(
        jsonResponse(200, { data: membership({ revoked_at: 1787767200 }) })
      )
    expect(await resolve()).toEqual({ status: 'denied' })
  })

  it('denies a membership that names a different user', async () => {
    fetchImpl
      .mockResolvedValueOnce(jsonResponse(200, { data: { app_id: APP } }))
      .mockResolvedValueOnce(
        jsonResponse(200, { data: membership({ user_id: 'usr_other' }) })
      )
    expect(await resolve()).toEqual({ status: 'denied' })
  })

  it('denies a Core rejection of the caller without calling it an outage', async () => {
    fetchImpl
      .mockResolvedValueOnce(jsonResponse(200, { data: { app_id: APP } }))
      .mockResolvedValueOnce(jsonResponse(403, { data: null, error: null }))
    expect(await resolve()).toEqual({ status: 'denied' })
  })

  it('reports a Core outage as unavailable', async () => {
    fetchImpl.mockResolvedValueOnce(jsonResponse(500, { data: null }))
    expect(await resolve()).toEqual({ status: 'unavailable' })
  })

  it('reports an unreachable Core as unavailable', async () => {
    fetchImpl.mockRejectedValueOnce(new Error('down'))
    expect(await resolve()).toEqual({ status: 'unavailable' })
  })
})
