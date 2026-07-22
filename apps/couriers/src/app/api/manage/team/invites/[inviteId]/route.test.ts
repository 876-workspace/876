import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  getManageContext: vi.fn(),
  getPlatformClient: vi.fn(),
  revokeInvite: vi.fn(),
}))

vi.mock('@/lib/auth/manage-context', () => ({
  getManageContext: mocks.getManageContext,
}))
vi.mock('@/lib/876/platform-client', () => ({
  getPlatformClient: mocks.getPlatformClient,
}))

import { DELETE } from './route'

describe('Couriers team invite revoke route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getManageContext.mockResolvedValue({
      orgId: 'org_123',
      role: 'owner',
      tenant: { id: 'ten_123' },
    })
    mocks.getPlatformClient.mockResolvedValue({
      orgs: { invites: { revoke: mocks.revokeInvite } },
    })
    mocks.revokeInvite.mockResolvedValue({
      data: { id: 'invite_123', status: 'revoked' },
      error: null,
    })
  })

  it('revokes the invite for the organization in the query string', async () => {
    const response = await DELETE(
      new NextRequest(
        'http://couriers.test/api/manage/team/invites/invite_123?orgSlug=island-logistics',
        { method: 'DELETE' }
      ),
      { params: Promise.resolve({ inviteId: 'invite_123' }) }
    )

    expect(response.status).toBe(200)
    expect(mocks.getManageContext).toHaveBeenCalledWith('island-logistics')
    expect(mocks.revokeInvite).toHaveBeenCalledWith('org_123', 'invite_123')
  })
})
