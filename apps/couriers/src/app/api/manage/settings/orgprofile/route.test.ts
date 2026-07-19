import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getManageContext: vi.fn(),
  getPlatformClient: vi.fn(),
  updateProfile: vi.fn(),
}))

vi.mock('@/lib/auth/manage-context', () => ({
  getManageContext: mocks.getManageContext,
}))
vi.mock('@/lib/876/platform-client', () => ({
  getPlatformClient: mocks.getPlatformClient,
}))

import { PATCH } from './route'

function request(body: string | Record<string, unknown>) {
  return new Request('http://couriers.test/api/manage/settings/orgprofile', {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  }) as never
}

function ctx(role: 'owner' | 'admin' | 'member') {
  return { orgId: 'org_123', orgSlug: 'island-logistics', role }
}

describe('Couriers organization profile route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getManageContext.mockResolvedValue(ctx('admin'))
    mocks.getPlatformClient.mockResolvedValue({
      orgs: { updateProfile: mocks.updateProfile },
    })
    mocks.updateProfile.mockResolvedValue({
      data: { object: 'organization', id: 'org_123', name: 'Island Logistics' },
      error: null,
    })
  })

  it('rejects malformed JSON without resolving context or the platform client', async () => {
    const response = await PATCH(request('{invalid'))
    const body = await response.json()

    expect(response.status).toBe(422)
    expect(body.error.message).toBe('Invalid organization profile.')
    expect(mocks.getManageContext).not.toHaveBeenCalled()
    expect(mocks.getPlatformClient).not.toHaveBeenCalled()
  })

  it('rejects a missing orgSlug without a platform call', async () => {
    const response = await PATCH(request({ name: 'Island Logistics' }))
    const body = await response.json()

    expect(response.status).toBe(422)
    expect(body.error.message).toBe('Invalid organization profile.')
    expect(mocks.getManageContext).not.toHaveBeenCalled()
  })

  it('rejects an empty name without a platform call', async () => {
    const response = await PATCH(
      request({ orgSlug: 'island-logistics', name: '   ' })
    )

    expect(response.status).toBe(422)
    expect(mocks.updateProfile).not.toHaveBeenCalled()
  })

  it('returns 401 when there is no manage context', async () => {
    mocks.getManageContext.mockResolvedValue(null)

    const response = await PATCH(
      request({ orgSlug: 'island-logistics', name: 'Island Logistics' })
    )
    const body = await response.json()

    expect(response.status).toBe(401)
    expect(body.error.message).toBe('Unauthorized.')
    expect(mocks.getPlatformClient).not.toHaveBeenCalled()
    expect(mocks.updateProfile).not.toHaveBeenCalled()
  })

  it('forbids a plain member from editing the profile', async () => {
    mocks.getManageContext.mockResolvedValue(ctx('member'))

    const response = await PATCH(
      request({ orgSlug: 'island-logistics', name: 'Hijacked' })
    )
    const body = await response.json()

    expect(response.status).toBe(403)
    expect(body.error.code).toBe('auth/forbidden')
    expect(mocks.getPlatformClient).not.toHaveBeenCalled()
    expect(mocks.updateProfile).not.toHaveBeenCalled()
  })

  it('authorizes the org against the supplied slug', async () => {
    await PATCH(
      request({ orgSlug: 'island-logistics', name: 'Island Logistics' })
    )

    expect(mocks.getManageContext).toHaveBeenCalledTimes(1)
    expect(mocks.getManageContext).toHaveBeenCalledWith('island-logistics')
  })

  it('updates the profile for an admin, passing only profile fields to the client', async () => {
    const response = await PATCH(
      request({
        orgSlug: 'island-logistics',
        name: 'Island Logistics Ltd',
        tax_id: '99-9999999',
        city: null,
      })
    )
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.error).toBeNull()
    expect(body.data).toMatchObject({ id: 'org_123' })
    expect(mocks.updateProfile).toHaveBeenCalledTimes(1)
    expect(mocks.updateProfile).toHaveBeenCalledWith('org_123', {
      name: 'Island Logistics Ltd',
      tax_id: '99-9999999',
      city: null,
    })
  })

  it('updates the profile for an owner', async () => {
    mocks.getManageContext.mockResolvedValue(ctx('owner'))

    const response = await PATCH(
      request({ orgSlug: 'island-logistics', name: 'Island Logistics' })
    )

    expect(response.status).toBe(200)
    expect(mocks.updateProfile).toHaveBeenCalledTimes(1)
  })

  it('surfaces a platform error as a 502', async () => {
    mocks.updateProfile.mockResolvedValue({
      data: null,
      error: { code: 'organization/not-found', message: 'Not found.' },
    })

    const response = await PATCH(
      request({ orgSlug: 'island-logistics', name: 'Island Logistics' })
    )
    const body = await response.json()

    expect(response.status).toBe(502)
    expect(body.error.code).toBe('organization/not-found')
  })
})
