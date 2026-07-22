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

const context = { params: Promise.resolve({ inviteId: 'invite_123' }) }

function deleteRequest(url: string) {
  return new NextRequest(url, { method: 'DELETE' })
}

function ctx(
  role: 'owner' | 'admin' | 'member',
  tenant: { id: string } | null = { id: 'ten_123' }
) {
  return {
    orgId: 'org_123',
    orgSlug: 'island-logistics',
    role,
    tenant,
  }
}

describe('Couriers team invite revoke route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getManageContext.mockResolvedValue(ctx('owner'))
    mocks.getPlatformClient.mockResolvedValue({
      orgs: { invites: { revoke: mocks.revokeInvite } },
    })
    mocks.revokeInvite.mockResolvedValue({
      data: { id: 'invite_123', status: 'revoked' },
      error: null,
    })
  })

  it('rejects a missing orgSlug without calling the platform', async () => {
    const response = await DELETE(
      deleteRequest(
        'http://couriers.test/api/manage/team/invites/invite_123'
      ),
      context
    )
    const body = await response.json()

    expect(response.status).toBe(422)
    expect(body.error.message).toBe('Organization is required.')
    expect(mocks.getManageContext).not.toHaveBeenCalled()
    expect(mocks.revokeInvite).not.toHaveBeenCalled()
  })

  it('returns 401 when there is no manage context', async () => {
    mocks.getManageContext.mockResolvedValue(null)

    const response = await DELETE(
      deleteRequest(
        'http://couriers.test/api/manage/team/invites/invite_123?orgSlug=island-logistics'
      ),
      context
    )

    expect(response.status).toBe(401)
    expect(mocks.revokeInvite).not.toHaveBeenCalled()
  })

  it('forbids a plain member from revoking invites', async () => {
    mocks.getManageContext.mockResolvedValue(ctx('member'))

    const response = await DELETE(
      deleteRequest(
        'http://couriers.test/api/manage/team/invites/invite_123?orgSlug=island-logistics'
      ),
      context
    )
    const body = await response.json()

    expect(response.status).toBe(403)
    expect(body.error.code).toBe('auth/forbidden')
    expect(body.error.message).toBe(
      'You do not have permission to revoke invites.'
    )
    expect(mocks.revokeInvite).not.toHaveBeenCalled()
  })

  it('returns 404 when the tenant is missing', async () => {
    mocks.getManageContext.mockResolvedValue(ctx('admin', null))

    const response = await DELETE(
      deleteRequest(
        'http://couriers.test/api/manage/team/invites/invite_123?orgSlug=island-logistics'
      ),
      context
    )

    expect(response.status).toBe(404)
    expect(mocks.revokeInvite).not.toHaveBeenCalled()
  })

  it('revokes the invite for the organization in the query string', async () => {
    const response = await DELETE(
      deleteRequest(
        'http://couriers.test/api/manage/team/invites/invite_123?orgSlug=island-logistics'
      ),
      context
    )
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.data).toEqual({ id: 'invite_123', status: 'revoked' })
    expect(body.error).toBeNull()
    expect(mocks.getManageContext).toHaveBeenCalledWith('island-logistics')
    expect(mocks.revokeInvite).toHaveBeenCalledTimes(1)
    expect(mocks.revokeInvite).toHaveBeenCalledWith('org_123', 'invite_123')
  })

  it('allows an admin (not only owner) to revoke invites', async () => {
    mocks.getManageContext.mockResolvedValue(ctx('admin'))

    const response = await DELETE(
      deleteRequest(
        'http://couriers.test/api/manage/team/invites/invite_123?orgSlug=island-logistics'
      ),
      context
    )

    expect(response.status).toBe(200)
    expect(mocks.revokeInvite).toHaveBeenCalledTimes(1)
  })

  it('propagates platform revoke failures as 502 with the platform code', async () => {
    mocks.revokeInvite.mockResolvedValue({
      data: null,
      error: {
        code: 'invite/not_found',
        message: 'Invite not found.',
      },
    })

    const response = await DELETE(
      deleteRequest(
        'http://couriers.test/api/manage/team/invites/invite_123?orgSlug=island-logistics'
      ),
      context
    )
    const body = await response.json()

    expect(response.status).toBe(502)
    expect(body.error.message).toBe('Invite not found.')
    expect(body.error.code).toBe('invite/not_found')
    expect(body.data).toBeNull()
  })
})
