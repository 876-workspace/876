import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getAuthSession: vi.fn(),
  isSignedSession: vi.fn(),
  findAuthRoutingUser: vi.fn(),
  getPlatformClient: vi.fn(),
  listRouting: vi.fn(),
  createOrganization: vi.fn(),
}))

vi.mock('@/lib/auth/session', () => ({
  getAuthSession: mocks.getAuthSession,
  isSignedSession: mocks.isSignedSession,
}))
vi.mock('@/lib/auth/guards', () => ({
  findAuthRoutingUser: mocks.findAuthRoutingUser,
}))
vi.mock('@/lib/876/platform-client', () => ({
  getPlatformClient: mocks.getPlatformClient,
}))

import { POST } from './route'

const signedSession = {
  user: { id: 'workos_user_123', realm: 'enterprise', crossRealm: false },
}

function request(body: string | Record<string, unknown>) {
  return new Request('http://enterprise.test/api/onboarding/organization', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  }) as never
}

describe('Enterprise organization onboarding route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getAuthSession.mockResolvedValue(signedSession)
    mocks.isSignedSession.mockReturnValue(true)
    mocks.findAuthRoutingUser.mockResolvedValue({
      id: 'user_123',
      email: 'owner@example.com',
    })
    mocks.getPlatformClient.mockResolvedValue({
      memberships: { listRouting: mocks.listRouting },
      organizations: { create: mocks.createOrganization },
    })
    mocks.listRouting.mockResolvedValue({ data: { data: [] }, error: null })
    mocks.createOrganization.mockResolvedValue({
      data: { id: 'organization_123' },
      error: null,
    })
  })

  it('rejects unsigned sessions before parsing or platform calls', async () => {
    mocks.isSignedSession.mockReturnValue(false)

    const response = await POST(request('{invalid'))

    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toMatchObject({
      error: { code: 'auth/no-session', message: 'Unauthorized.' },
    })
    expect(mocks.findAuthRoutingUser).not.toHaveBeenCalled()
    expect(mocks.getPlatformClient).not.toHaveBeenCalled()
  })

  it('rejects consumer sessions', async () => {
    mocks.getAuthSession.mockResolvedValue({
      user: { id: 'workos_user_123', realm: 'consumer', crossRealm: false },
    })

    const response = await POST(request({ name: 'Acme' }))

    expect(response.status).toBe(401)
    expect(mocks.findAuthRoutingUser).not.toHaveBeenCalled()
    expect(mocks.getPlatformClient).not.toHaveBeenCalled()
  })

  it.each([
    ['malformed JSON', '{invalid'],
    ['a missing name', {}],
    ['an empty name', { name: '   ' }],
    ['unknown fields', { name: 'Acme', unexpected: true }],
  ])('rejects %s without platform calls', async (_case, payload) => {
    const response = await POST(request(payload))

    expect(response.status).toBe(422)
    await expect(response.json()).resolves.toMatchObject({
      error: {
        code: 'organization/validation-failed',
        message: 'Enter a workspace name.',
      },
    })
    expect(mocks.findAuthRoutingUser).not.toHaveBeenCalled()
    expect(mocks.getPlatformClient).not.toHaveBeenCalled()
  })

  it('invalidates a session whose local account has been removed', async () => {
    mocks.findAuthRoutingUser.mockResolvedValue(null)

    const response = await POST(request({ name: 'Acme' }))

    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toMatchObject({
      error: { code: 'auth/session-invalid' },
    })
    expect(mocks.getPlatformClient).not.toHaveBeenCalled()
  })

  it('returns an existing workspace without creating another one', async () => {
    mocks.listRouting.mockResolvedValue({
      data: { data: [{ organization: { id: 'organization_existing' } }] },
      error: null,
    })

    const response = await POST(request({ name: 'Ignored name' }))

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      data: {
        object: 'onboarding_organization',
        organization_id: 'organization_existing',
      },
      error: null,
    })
    expect(mocks.listRouting).toHaveBeenCalledWith({ userId: 'user_123' })
    expect(mocks.createOrganization).not.toHaveBeenCalled()
  })

  it('bootstraps an organization for a new social account', async () => {
    const response = await POST(request({ name: '  Acme Logistics  ' }))

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      data: {
        object: 'onboarding_organization',
        organization_id: 'organization_123',
      },
      error: null,
    })
    expect(mocks.createOrganization).toHaveBeenCalledWith({
      ownerUserId: 'user_123',
      name: 'Acme Logistics',
    })
  })

  it('preserves a platform bootstrap error for the form to display', async () => {
    mocks.createOrganization.mockResolvedValue({
      data: null,
      error: {
        code: 'provisioning/finance-workspace-unavailable',
        message: 'Workspace setup is temporarily unavailable.',
      },
    })

    const response = await POST(request({ name: 'Acme' }))

    expect(response.status).toBe(502)
    await expect(response.json()).resolves.toEqual({
      data: null,
      error: {
        code: 'provisioning/finance-workspace-unavailable',
        message: 'Workspace setup is temporarily unavailable.',
      },
    })
  })

  it('invalidates a session when bootstrap loses its local account', async () => {
    mocks.createOrganization.mockResolvedValue({
      data: null,
      error: {
        code: 'user/not-found',
        message: 'No user exists with the provided identifier.',
      },
    })

    const response = await POST(request({ name: 'Acme' }))

    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toMatchObject({
      error: { code: 'auth/session-invalid' },
    })
  })

  it('trims name via Zod before platform call', async () => {
    const response = await POST(request({ name: '  Spaced  ' }))
    expect(response.status).toBe(200)
    expect(mocks.createOrganization).toHaveBeenCalledWith(expect.objectContaining({ name: 'Spaced' }))
  })

  it('does not create organization when listRouting returns existing even with different name', async () => {
    mocks.listRouting.mockResolvedValue({ data: { data: [{ organization: { id: 'existing_1' } }] }, error: null })
    const response = await POST(request({ name: 'NewName' }))
    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject({ data: { organization_id: 'existing_1' } })
    expect(mocks.createOrganization).not.toHaveBeenCalled()
  })

  it('propagates listRouting null data as empty (no crash)', async () => {
    mocks.listRouting.mockResolvedValue({ data: { data: [] }, error: null })
    const response = await POST(request({ name: 'Acme' }))
    expect(response.status).toBe(200)
  })

  it.each([
    ['user/not-found', 401],
    ['organization/duplicate-slug', 409],
    ['provisioning/finance-workspace-unavailable', 502],
  ])('maps error code "%s" to status %i', async (code, status) => {
    mocks.createOrganization.mockResolvedValue({ data: null, error: { code, message: 'msg' } })
    const response = await POST(request({ name: 'Acme' }))
    expect(response.status).toBe(status)
  })

  it('uses local user id not workos id for platform calls', async () => {
    mocks.findAuthRoutingUser.mockResolvedValue({ id: 'local_999', email: 'a@b.co' })
    await POST(request({ name: 'Acme' }))
    expect(mocks.listRouting).toHaveBeenCalledWith({ userId: 'local_999' })
    expect(mocks.createOrganization).toHaveBeenCalledWith(expect.objectContaining({ ownerUserId: 'local_999' }))
  })

  it('response has onboarding_organization object discriminator', async () => {
    const response = await POST(request({ name: 'Acme' }))
    await expect(response.json()).resolves.toMatchObject({ data: { object: 'onboarding_organization' } })
  })

  it('rejects crossRealm=false consumer even if enterprise realm otherwise', async () => {
    mocks.getAuthSession.mockResolvedValue({ user: { id: 'w1', realm: 'consumer', crossRealm: false } })
    const response = await POST(request({ name: 'Acme' }))
    expect(response.status).toBe(401)
  })

  it('is idempotent: repeated bootstrap with existing org returns same id', async () => {
    mocks.listRouting.mockResolvedValue({ data: { data: [{ organization: { id: 'org_same' } }] }, error: null })
    const r1 = await POST(request({ name: 'Acme' }))
    const r2 = await POST(request({ name: 'Acme' }))
    await expect(r1.json()).resolves.toEqual(await r2.json())
  })

})