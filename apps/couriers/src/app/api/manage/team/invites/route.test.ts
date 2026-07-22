import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getManageContext: vi.fn(),
  getPlatformClient: vi.fn(),
  retrieveRole: vi.fn(),
  createInvite: vi.fn(),
}))

vi.mock('@/lib/auth/manage-context', () => ({
  getManageContext: mocks.getManageContext,
}))
vi.mock('@/lib/876/platform-client', () => ({
  getPlatformClient: mocks.getPlatformClient,
}))
vi.mock('@/lib/service', () => ({
  service: { roles: { retrieve: mocks.retrieveRole } },
}))
vi.mock('@/lib/couriers-app', () => ({
  COURIERS_APP_SLUG: '876-couriers',
}))

import { POST } from './route'

function request(body: Record<string, unknown>) {
  return new Request('http://couriers.test/api/manage/team/invites', {
    method: 'POST',
    body: JSON.stringify(body),
  }) as never
}

describe('Couriers team invite route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getManageContext.mockResolvedValue({
      orgId: 'org_123',
      role: 'admin',
      tenant: { id: 'ten_123' },
    })
    mocks.retrieveRole.mockResolvedValue({
      id: 'role_admin',
      systemKey: 'admin',
    })
    mocks.getPlatformClient.mockResolvedValue({
      orgs: { invites: { create: mocks.createInvite } },
    })
    mocks.createInvite.mockResolvedValue({
      data: { id: 'invite_123', email: 'user@example.com' },
      error: null,
    })
  })

  it('resolves the tenant role and creates a source-app invite', async () => {
    const response = await POST(
      request({
        orgSlug: 'island-logistics',
        email: 'user@example.com',
        roleId: 'role_admin',
      })
    )

    expect(response.status).toBe(201)
    expect(mocks.retrieveRole).toHaveBeenCalledWith('ten_123', 'role_admin')
    expect(mocks.createInvite).toHaveBeenCalledWith('org_123', {
      email: 'user@example.com',
      role: 'admin',
      sourceAppSlug: '876-couriers',
    })
  })

  it('forbids a plain organization member', async () => {
    mocks.getManageContext.mockResolvedValue({
      orgId: 'org_123',
      role: 'member',
      tenant: { id: 'ten_123' },
    })

    const response = await POST(
      request({
        orgSlug: 'island-logistics',
        email: 'user@example.com',
        roleId: 'role_staff',
      })
    )

    expect(response.status).toBe(403)
    expect(mocks.retrieveRole).not.toHaveBeenCalled()
  })
})
