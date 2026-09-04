import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  requireConsoleCrmPermission,
  requireConsoleFeature,
  requireConsolePermission,
} from './route-guard'

const mocks = vi.hoisted(() => ({
  getAuthSession: vi.fn(),
  isSignedSession: vi.fn(),
  findConsoleAccess: vi.fn(),
  resolveAccessContext: vi.fn(),
  listAppMemberships: vi.fn(),
}))

vi.mock('@/lib/services/workspace', () => ({
  workspace: {
    apps: { memberships: { list: mocks.listAppMemberships } },
  },
}))

vi.mock('./session', () => ({
  getAuthSession: mocks.getAuthSession,
  isSignedSession: mocks.isSignedSession,
}))

vi.mock('./guards', () => ({
  findConsoleAccess: mocks.findConsoleAccess,
}))

vi.mock('@/lib/auth/access-context', () => ({
  resolveAccessContext: mocks.resolveAccessContext,
}))

const caller = {
  id: 'user_caller',
  role: 'admin',
  permissions: ['console:access', 'users:update'],
  status: 'active',
}

function context(permissions: string[], features: string[] = []) {
  return {
    subject: { userId: 'user_caller' },
    permissions,
    features,
    experiments: {},
  }
}

describe('requireConsolePermission route guard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getAuthSession.mockResolvedValue({
      user: { id: 'user_caller', email: 'admin@example.com' },
    })
    mocks.isSignedSession.mockReturnValue(true)
    mocks.findConsoleAccess.mockResolvedValue(caller)
    mocks.resolveAccessContext.mockResolvedValue(
      context(['console:access', 'users:update'], ['console-widgets'])
    )
  })

  it('returns 401 without querying access for an unsigned session', async () => {
    mocks.isSignedSession.mockReturnValue(false)

    const result = await requireConsolePermission('users:update')

    expect(result.caller).toBeNull()
    expect(result.sessionUser).toBeNull()
    expect(result.response?.status).toBe(401)
    await expect(result.response?.json()).resolves.toEqual({
      data: null,
      error: { code: 'error/unauthorized', message: 'Sign in to continue.' },
    })
    expect(mocks.findConsoleAccess).not.toHaveBeenCalled()
    expect(mocks.resolveAccessContext).not.toHaveBeenCalled()
  })

  it('returns 403 when no access context resolves', async () => {
    mocks.resolveAccessContext.mockResolvedValue(null)

    const result = await requireConsolePermission('users:update')

    expect(result.caller).toBeNull()
    expect(result.response?.status).toBe(403)
    await expect(result.response?.json()).resolves.toEqual({
      data: null,
      error: {
        code: 'error/forbidden',
        message: 'You do not have permission to access this resource.',
      },
    })
  })

  it.each([
    ['missing access', null],
    ['inactive access', { ...caller, status: 'suspended' }],
  ])('returns 403 for %s', async (_name, access) => {
    mocks.findConsoleAccess.mockResolvedValue(access)

    const result = await requireConsolePermission('users:update')

    expect(result.caller).toBeNull()
    expect(result.response?.status).toBe(403)
    await expect(result.response?.json()).resolves.toEqual({
      data: null,
      error: {
        code: 'error/forbidden',
        message: 'You do not have permission to access this resource.',
      },
    })
  })

  it('returns 403 when the context lacks console:access', async () => {
    mocks.resolveAccessContext.mockResolvedValue(context(['users:update']))

    const result = await requireConsolePermission('users:update')

    expect(result.caller).toBeNull()
    expect(result.response?.status).toBe(403)
  })

  it('returns 403 when the caller lacks the requested permission', async () => {
    const result = await requireConsolePermission('users:delete')

    expect(result.caller).toBeNull()
    expect(result.response?.status).toBe(403)
    await expect(result.response?.json()).resolves.toEqual({
      data: null,
      error: {
        code: 'error/forbidden',
        message: 'You do not have permission to access this resource.',
      },
    })
  })

  it('returns the authorized caller without a response', async () => {
    const result = await requireConsolePermission('users:update')

    expect(result).toEqual({
      caller,
      sessionUser: { id: 'user_caller', email: 'admin@example.com' },
      response: null,
    })
    expect(mocks.getAuthSession).toHaveBeenCalledTimes(1)
    expect(mocks.findConsoleAccess).toHaveBeenCalledTimes(1)
    expect(mocks.findConsoleAccess).toHaveBeenCalledWith('user_caller')
    expect(mocks.resolveAccessContext).toHaveBeenCalledWith('user_caller')
  })
})

describe('requireConsoleFeature route guard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getAuthSession.mockResolvedValue({
      user: { id: 'user_caller', email: 'admin@example.com' },
    })
    mocks.isSignedSession.mockReturnValue(true)
    mocks.findConsoleAccess.mockResolvedValue(caller)
    mocks.resolveAccessContext.mockResolvedValue(
      context(['console:access'], ['console-widgets'])
    )
  })

  it('authorizes a caller holding the required feature', async () => {
    const result = await requireConsoleFeature('console-widgets')

    expect(result.response).toBeNull()
    expect(result.caller).toEqual(caller)
  })

  it('returns 403 when the required feature is not enabled', async () => {
    const result = await requireConsoleFeature('console-chat')

    expect(result.caller).toBeNull()
    expect(result.response?.status).toBe(403)
  })
})

describe('requireConsoleCrmPermission route guard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getAuthSession.mockResolvedValue({
      user: { id: 'user_caller', email: 'admin@example.com' },
    })
    mocks.isSignedSession.mockReturnValue(true)
    mocks.findConsoleAccess.mockResolvedValue(caller)
    mocks.resolveAccessContext.mockResolvedValue(
      context(['console:access', 'crm/requests.view'])
    )
  })

  it('authorizes on the Console permission alone', async () => {
    const result = await requireConsoleCrmPermission('org_876', 'requests.edit')

    expect(result).toEqual({
      caller,
      sessionUser: { id: 'user_caller', email: 'admin@example.com' },
      response: null,
    })
  })

  it('never consults the target organization app-access plane', async () => {
    await requireConsoleCrmPermission('org_876', 'requests.edit')

    expect(mocks.listAppMemberships).not.toHaveBeenCalled()
  })

  it('authorizes an operator with no membership in the target organization', async () => {
    const result = await requireConsoleCrmPermission(
      'org_a_customer',
      'requests.delete'
    )

    expect(result.response).toBeNull()
    expect(result.caller).toEqual(caller)
  })

  it('denies an operator without the Console requests permission', async () => {
    mocks.resolveAccessContext.mockResolvedValue(context(['console:access']))

    const result = await requireConsoleCrmPermission('org_876', 'requests.edit')

    expect(result.response?.status).toBe(403)
    expect(mocks.listAppMemberships).not.toHaveBeenCalled()
  })

  it('denies an operator whose Console access is inactive', async () => {
    mocks.findConsoleAccess.mockResolvedValue({ ...caller, status: 'revoked' })

    const result = await requireConsoleCrmPermission('org_876', 'requests.edit')

    expect(result.response?.status).toBe(403)
  })

  it('returns 401 for an unsigned session', async () => {
    mocks.isSignedSession.mockReturnValue(false)

    const result = await requireConsoleCrmPermission('org_876', 'requests.edit')

    expect(result.response?.status).toBe(401)
  })

  it('rejects with the canonical envelope the browser client accepts', async () => {
    mocks.resolveAccessContext.mockResolvedValue(context(['console:access']))

    const result = await requireConsoleCrmPermission('org_876', 'requests.edit')

    await expect(result.response?.json()).resolves.toEqual({
      data: null,
      error: {
        code: 'error/forbidden',
        message: 'You do not have permission to access this resource.',
      },
    })
  })
})
