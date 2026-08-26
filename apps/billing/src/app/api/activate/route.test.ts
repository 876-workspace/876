import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getContext: vi.fn(),
  getPlatformClient: vi.fn(),
  createSubscription: vi.fn(),
}))

vi.mock('@/lib/auth/billing-context', () => ({
  getContext: mocks.getContext,
  canManageBilling: (role: string) => role === 'owner' || role === 'admin',
}))
vi.mock('@/lib/876/platform-client', () => ({
  getPlatformClient: mocks.getPlatformClient,
}))
vi.mock('@/lib/billing-app', () => ({ BILLING_APP_SLUG: '876-billing' }))

import { POST } from './route'

function jsonResponse(response: Response) {
  return response.json() as Promise<Record<string, unknown>>
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.getPlatformClient.mockResolvedValue({
    subscriptions: { create: mocks.createSubscription },
  })
  mocks.createSubscription.mockResolvedValue({
    data: { id: 'sub_123', status: 'active' },
    error: null,
  })
})

describe('POST /api/activate — billing entitlement activation', () => {
  it('When no billing context, then returns 401 unauthorized', async () => {
    // Arrange
    mocks.getContext.mockResolvedValue(null)
    // Act
    const res = await POST()
    const body = await jsonResponse(res)
    // Assert
    expect(res.status).toBe(401)
    expect(body.error).toBeDefined()
    expect(mocks.createSubscription).not.toHaveBeenCalled()
  })

  it.each([
    ['member', false],
    ['viewer', false],
    ['unknown', false],
  ])(
    'When role is %s without manage permission, then returns 403',
    async (role) => {
      mocks.getContext.mockResolvedValue({
        orgId: 'org_1',
        role,
        accessStatus: 'none',
      })
      const res = await POST()
      expect(res.status).toBe(403)
      const body = await jsonResponse(res)
      expect(body.error).toBeDefined()
    }
  )

  it.each([
    ['owner', true],
    ['admin', true],
  ])(
    'When role is %s with manage permission and already active, then returns 200 alreadyActive',
    async (role) => {
      mocks.getContext.mockResolvedValue({
        orgId: 'org_123',
        role,
        accessStatus: 'active',
      })
      const res = await POST()
      expect(res.status).toBe(200)
      const body = (await jsonResponse(res)) as {
        data: { alreadyActive: boolean }
      }
      expect(body.data.alreadyActive).toBe(true)
      expect(mocks.createSubscription).not.toHaveBeenCalled()
    }
  )

  it('When access is blocked, then returns 403 even for owner', async () => {
    mocks.getContext.mockResolvedValue({
      orgId: 'org_123',
      role: 'owner',
      accessStatus: 'blocked',
    })
    const res = await POST()
    expect(res.status).toBe(403)
    const body = await jsonResponse(res)
    expect(body.error).toBeDefined()
    expect(mocks.createSubscription).not.toHaveBeenCalled()
  })

  it('When admin is blocked, then returns 403 without reaching platform', async () => {
    mocks.getContext.mockResolvedValue({
      orgId: 'org_123',
      role: 'admin',
      accessStatus: 'blocked',
    })
    const res = await POST()
    expect(res.status).toBe(403)
    expect(mocks.createSubscription).not.toHaveBeenCalled()
  })

  it('When entitlement is none and caller is owner, then creates subscription with billing slug', async () => {
    mocks.getContext.mockResolvedValue({
      orgId: 'org_123',
      role: 'owner',
      accessStatus: 'none',
    })
    const res = await POST()
    expect(mocks.createSubscription).toHaveBeenCalledWith('org_123', {
      appSlug: '876-billing',
    })
    expect(res.status).toBe(201)
    const body = (await jsonResponse(res)) as { data: { id: string } }
    expect(body.data.id).toBe('sub_123')
  })

  it('When entitlement is none and caller is admin, then creates subscription', async () => {
    mocks.getContext.mockResolvedValue({
      orgId: 'org_456',
      role: 'admin',
      accessStatus: 'none',
    })
    const res = await POST()
    expect(mocks.createSubscription).toHaveBeenCalledWith('org_456', {
      appSlug: '876-billing',
    })
    expect(res.status).toBe(201)
  })

  it('When platform returns error, then responds with 502', async () => {
    mocks.getContext.mockResolvedValue({
      orgId: 'org_123',
      role: 'owner',
      accessStatus: 'none',
    })
    mocks.createSubscription.mockResolvedValue({
      data: null,
      error: { code: 'platform/unavailable', message: 'down' },
    })
    const res = await POST()
    expect(res.status).toBe(502)
    const body = await jsonResponse(res)
    expect(body.error).toBeDefined()
  })

  it('When platform throws, then propagates exception (not swallowed)', async () => {
    mocks.getContext.mockResolvedValue({
      orgId: 'org_123',
      role: 'owner',
      accessStatus: 'none',
    })
    mocks.createSubscription.mockRejectedValue(new Error('network failure'))
    await expect(POST()).rejects.toThrow('network failure')
  })

  it('When alreadyActive trialing counts as active (mapped upstream), then owner is not re-provisioned', async () => {
    // AccessStatus is already mapped before route sees it; active includes trialing.
    mocks.getContext.mockResolvedValue({
      orgId: 'org_123',
      role: 'owner',
      accessStatus: 'active',
    })
    const res = await POST()
    expect(res.status).toBe(200)
    expect(mocks.createSubscription).not.toHaveBeenCalled()
  })

  it('When member with blocked tries to activate, permission check short-circuits before blocked check', async () => {
    // member fails at canManageBilling, so blocked branch not reached — but still 403
    mocks.getContext.mockResolvedValue({
      orgId: 'org_123',
      role: 'member',
      accessStatus: 'blocked',
    })
    const res = await POST()
    expect(res.status).toBe(403)
    // ensure we did not accidentally call platform
    expect(mocks.createSubscription).not.toHaveBeenCalled()
  })

  it('Uses correct orgId from context, not session', async () => {
    mocks.getContext.mockResolvedValue({
      orgId: 'org_specific',
      role: 'owner',
      accessStatus: 'none',
    })
    await POST()
    expect(mocks.createSubscription).toHaveBeenCalledWith(
      'org_specific',
      expect.anything()
    )
  })
})
