import { beforeEach, describe, expect, it, vi } from 'vitest'

const { retrieveMe } = vi.hoisted(() => ({ retrieveMe: vi.fn() }))
vi.mock('@/lib/services/workspace', () => ({
  getWorkspace: vi.fn(async () => ({ members: { retrieveMe } })),
}))

const {
  APP_ASSIGN_PERMISSION,
  requireAppAccessManager,
  resolveCrmAccessViewer,
} = await import('./app-access')

function memberMe(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    object: 'organization_member',
    id: 'mem_8Zx1',
    user_id: 'user_2kL9mN4q',
    role: 'admin',
    role_id: 'orole_1',
    position: 'Support lead',
    status: 'active',
    first_name: 'Alejandra',
    last_name: 'Reyes',
    email: 'alejandra@example.com',
    avatar: null,
    created_at: 1717200000,
    permissions: ['members:read', 'apps:assign'],
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('resolveCrmAccessViewer', () => {
  it('returns the acting membership with its effective permissions', async () => {
    retrieveMe.mockResolvedValue({ data: memberMe(), error: null })

    const viewer = await resolveCrmAccessViewer('org_4XmK9wQr')

    expect(viewer).toEqual({
      status: 'ok',
      viewer: {
        membershipId: 'mem_8Zx1',
        userId: 'user_2kL9mN4q',
        permissions: ['members:read', 'apps:assign'],
        canReadMembers: true,
        canManageAppAccess: true,
      },
    })
    expect(retrieveMe).toHaveBeenCalledTimes(1)
    expect(retrieveMe).toHaveBeenCalledWith('org_4XmK9wQr')
  })

  it('reports no manage permission when apps:assign is absent', async () => {
    retrieveMe.mockResolvedValue({
      data: memberMe({ permissions: ['members:read'] }),
      error: null,
    })

    const viewer = await resolveCrmAccessViewer('org_no_assign')

    expect(viewer.status === 'ok' && viewer.viewer.canManageAppAccess).toBe(
      false
    )
    expect(viewer.status === 'ok' && viewer.viewer.canReadMembers).toBe(true)
  })

  it('reports neither permission for a member with an empty permission set', async () => {
    retrieveMe.mockResolvedValue({
      data: memberMe({ permissions: [] }),
      error: null,
    })

    const viewer = await resolveCrmAccessViewer('org_empty')

    expect(viewer.status === 'ok' && viewer.viewer.canReadMembers).toBe(false)
    expect(viewer.status === 'ok' && viewer.viewer.canManageAppAccess).toBe(
      false
    )
  })

  it('reports unavailable, not a denial, when the platform returns an error', async () => {
    retrieveMe.mockResolvedValue({
      data: null,
      error: { code: 'organization/not-found', message: 'Not found.' },
    })

    await expect(resolveCrmAccessViewer('org_missing')).resolves.toEqual({
      status: 'unavailable',
      code: 'organization/not-found',
    })
  })

  it('reports unavailable when the platform returns no data and no error', async () => {
    retrieveMe.mockResolvedValue({ data: null, error: null })

    await expect(resolveCrmAccessViewer('org_blank')).resolves.toEqual({
      status: 'unavailable',
      code: 'platform/unavailable',
    })
  })

  it('does not treat a permission that merely contains the key as a match', async () => {
    retrieveMe.mockResolvedValue({
      data: memberMe({ permissions: ['apps:assignments:read'] }),
      error: null,
    })

    const viewer = await resolveCrmAccessViewer('org_prefix')

    expect(viewer.status === 'ok' && viewer.viewer.canManageAppAccess).toBe(
      false
    )
  })
})

describe('requireAppAccessManager', () => {
  it('returns the viewer and no response when the caller may manage access', async () => {
    retrieveMe.mockResolvedValue({ data: memberMe(), error: null })

    const result = await requireAppAccessManager('org_ok')

    expect(result.response).toBeNull()
    expect(result.viewer?.membershipId).toBe('mem_8Zx1')
  })

  it('returns a 403 value, not a redirect, when the permission is missing', async () => {
    retrieveMe.mockResolvedValue({
      data: memberMe({ permissions: ['members:read'] }),
      error: null,
    })

    const result = await requireAppAccessManager('org_denied')

    expect(result.viewer).toBeNull()
    expect(result.response?.status).toBe(403)
    await expect(result.response?.json()).resolves.toEqual({
      data: null,
      error: {
        code: 'crm/forbidden',
        message: 'You do not have permission to manage app access.',
      },
    })
  })

  it('answers 503, not 403, when access could not be verified at all', async () => {
    // Telling an operator they lack a permission when the truth is that nothing
    // could be checked is a false statement about their access.
    retrieveMe.mockResolvedValue({
      data: null,
      error: { code: 'platform/unavailable', message: 'Down.' },
    })

    const result = await requireAppAccessManager('org_unavailable')

    expect(result.viewer).toBeNull()
    expect(result.response?.status).toBe(503)
    await expect(result.response?.json()).resolves.toEqual({
      data: null,
      error: {
        code: 'crm/access-unavailable',
        message: 'Access could not be verified. Try again.',
      },
    })
  })

  it('still refuses to proceed when access could not be verified', async () => {
    retrieveMe.mockResolvedValue({ data: null, error: null })

    const result = await requireAppAccessManager('org_unknown')

    expect(result.viewer).toBeNull()
    expect(result.response).not.toBeNull()
  })

  it('does not leak the platform error message to the caller', async () => {
    retrieveMe.mockResolvedValue({
      data: null,
      error: {
        code: 'platform/unavailable',
        message: 'connection to 10.0.0.4:5432 refused',
      },
    })

    const result = await requireAppAccessManager('org_leak')
    const body = (await result.response?.json()) as {
      error: { message: string }
    }

    expect(body.error.message).not.toContain('10.0.0.4')
  })
})

describe('permission key contract', () => {
  it('pins the organization permission that authorizes app assignment', () => {
    // A durable identifier: stored on organization roles. Changing it requires a
    // coordinated migration, not an edit here.
    expect(APP_ASSIGN_PERMISSION).toBe('apps:assign')
  })
})
