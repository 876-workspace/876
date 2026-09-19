import { beforeEach, describe, expect, it, vi } from 'vitest'

const { retrieveMe } = vi.hoisted(() => ({ retrieveMe: vi.fn() }))
vi.mock('@/lib/clients/workspace', () => ({
  getWorkspace: vi.fn(async () => ({ members: { retrieveMe } })),
}))
const {
  APP_ASSIGN_PERMISSION,
  requireAppAccessManager,
  resolveInvoiceAccessViewer,
} = await import('./app-access')
function memberMe(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    object: 'organization_member',
    id: 'mem_1',
    user_id: 'usr_1',
    role: 'admin',
    role_id: null,
    position: null,
    status: 'active',
    first_name: 'Ada',
    last_name: 'Lovelace',
    email: 'ada@example.com',
    avatar: null,
    created_at: 1,
    permissions: ['members:read', 'apps:assign'],
    ...overrides,
  }
}
beforeEach(() => vi.clearAllMocks())

describe('resolveInvoiceAccessViewer', () => {
  it('returns the acting membership with its effective permissions', async () => {
    retrieveMe.mockResolvedValue({ data: memberMe(), error: null })

    await expect(resolveInvoiceAccessViewer('org_1')).resolves.toEqual({
      status: 'ok',
      viewer: {
        membershipId: 'mem_1',
        userId: 'usr_1',
        permissions: ['members:read', 'apps:assign'],
        canReadMembers: true,
        canManageAppAccess: true,
      },
    })
    expect(retrieveMe).toHaveBeenCalledTimes(1)
    expect(retrieveMe).toHaveBeenCalledWith('org_1')
  })

  it('reports no manage permission when apps:assign is absent', async () => {
    retrieveMe.mockResolvedValue({
      data: memberMe({ permissions: ['members:read'] }),
      error: null,
    })

    const outcome = await resolveInvoiceAccessViewer('org_2')

    expect(outcome.status).toBe('ok')
    expect(outcome.status === 'ok' && outcome.viewer.canManageAppAccess).toBe(
      false
    )
    expect(outcome.status === 'ok' && outcome.viewer.canReadMembers).toBe(true)
  })

  it('reports neither permission for an empty permission set', async () => {
    retrieveMe.mockResolvedValue({
      data: memberMe({ permissions: [] }),
      error: null,
    })

    const outcome = await resolveInvoiceAccessViewer('org_3')

    expect(outcome.status === 'ok' && outcome.viewer.canReadMembers).toBe(false)
    expect(outcome.status === 'ok' && outcome.viewer.canManageAppAccess).toBe(
      false
    )
  })

  it('reports unavailable, not a denial, when the platform returns an error', async () => {
    retrieveMe.mockResolvedValue({
      data: null,
      error: { code: 'organization/not-found', message: 'Not found.' },
    })

    await expect(resolveInvoiceAccessViewer('org_4')).resolves.toEqual({
      status: 'unavailable',
      code: 'organization/not-found',
    })
  })

  it('reports unavailable when the platform returns no data and no error', async () => {
    retrieveMe.mockResolvedValue({ data: null, error: null })

    await expect(resolveInvoiceAccessViewer('org_5')).resolves.toEqual({
      status: 'unavailable',
      code: 'platform/unavailable',
    })
  })

  it('does not treat a permission that merely contains the key as a match', async () => {
    retrieveMe.mockResolvedValue({
      data: memberMe({ permissions: ['apps:assignments:read'] }),
      error: null,
    })

    const outcome = await resolveInvoiceAccessViewer('org_6')

    expect(outcome.status === 'ok' && outcome.viewer.canManageAppAccess).toBe(
      false
    )
  })
})

describe('requireAppAccessManager', () => {
  it('returns the viewer and no response when the caller may manage access', async () => {
    retrieveMe.mockResolvedValue({ data: memberMe(), error: null })

    const result = await requireAppAccessManager('org_ok')

    expect(result.response).toBeNull()
    expect(result.viewer?.membershipId).toBe('mem_1')
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
        code: 'invoice/forbidden',
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
        code: 'invoice/access-unavailable',
        message: 'Access could not be verified. Try again.',
      },
    })
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
    expect(APP_ASSIGN_PERMISSION).toBe('apps:assign')
  })
})
