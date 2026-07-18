import { beforeEach, describe, expect, it, vi } from 'vitest'

import { requireConsolePermission } from './route-guard'

const mocks = vi.hoisted(() => ({
  getAuthSession: vi.fn(),
  isSignedSession: vi.fn(),
  findConsoleAccess: vi.fn(),
  hasPermission: vi.fn(),
}))

vi.mock('./session', () => ({
  getAuthSession: mocks.getAuthSession,
  isSignedSession: mocks.isSignedSession,
}))

vi.mock('./guards', () => ({
  findConsoleAccess: mocks.findConsoleAccess,
  hasPermission: mocks.hasPermission,
}))

const caller = {
  id: 'user_caller',
  role: 'admin',
  permissions: ['console:access', 'users:update'],
  status: 'active',
}

describe('requireConsolePermission route guard', () => {
  beforeEach(() => {
    mocks.getAuthSession.mockResolvedValue({
      user: { id: 'user_caller', email: 'admin@example.com' },
    })
    mocks.isSignedSession.mockReturnValue(true)
    mocks.findConsoleAccess.mockResolvedValue(caller)
    mocks.hasPermission.mockReturnValue(true)
    vi.clearAllMocks()
  })

  it('returns 401 without querying access for an unsigned session', async () => {
    mocks.isSignedSession.mockReturnValue(false)

    const result = await requireConsolePermission('users:update')

    expect(result.caller).toBeNull()
    expect(result.sessionUser).toBeNull()
    expect(result.response?.status).toBe(401)
    await expect(result.response?.json()).resolves.toEqual({
      error: 'Unauthorized.',
    })
    expect(mocks.findConsoleAccess).not.toHaveBeenCalled()
    expect(mocks.hasPermission).not.toHaveBeenCalled()
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
      error: 'Insufficient permissions.',
    })
  })

  it('returns 403 when the caller lacks the requested permission', async () => {
    mocks.hasPermission.mockReturnValue(false)

    const result = await requireConsolePermission('users:delete')

    expect(result.caller).toBeNull()
    expect(result.response?.status).toBe(403)
    await expect(result.response?.json()).resolves.toEqual({
      error: 'Insufficient permissions.',
    })
    expect(mocks.hasPermission).toHaveBeenCalledTimes(1)
    expect(mocks.hasPermission).toHaveBeenCalledWith(caller, 'users:delete')
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
    expect(mocks.hasPermission).toHaveBeenCalledTimes(1)
    expect(mocks.hasPermission).toHaveBeenCalledWith(caller, 'users:update')
  })
})
