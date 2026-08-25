import { beforeEach, describe, expect, it, vi } from 'vitest'

import { CONSOLE_ACCESS_PERMISSION } from '@/lib/permissions'

import {
  findConsoleAccess,
  requireConsoleAccount,
  requireConsolePermission,
  requireSession,
} from './guards'

const mocks = vi.hoisted(() => ({
  redirect: vi.fn(),
  retrieveUser: vi.fn(),
  retrieveTeamMember: vi.fn(),
  getAuthSession: vi.fn(),
  isSignedSession: vi.fn(),
}))

vi.mock('next/navigation', () => ({ redirect: mocks.redirect }))

vi.mock('@/lib/876', () => ({
  $876: {
    users: {
      admin: { retrieve: mocks.retrieveUser },
    },
  },
}))

vi.mock('@/lib/service', () => ({
  service: { team: { retrieve: mocks.retrieveTeamMember } },
}))

vi.mock('./session', () => ({
  getAuthSession: mocks.getAuthSession,
  isSignedSession: mocks.isSignedSession,
}))

const activeAccess = {
  id: 'user_operator',
  role: 'admin',
  permissions: ['console:access', 'users:update'],
  status: 'active',
}

function activeMember(overrides = {}) {
  return {
    userId: activeAccess.id,
    roleName: activeAccess.role,
    status: activeAccess.status,
    role: { permissions: activeAccess.permissions },
    ...overrides,
  }
}

function redirectSignal(path: string): Error {
  return Object.assign(new Error(`redirect:${path}`), { path })
}

describe('Console auth guards', () => {
  beforeEach(() => {
    mocks.redirect.mockImplementation((path: string) => {
      throw redirectSignal(path)
    })
    mocks.retrieveUser.mockResolvedValue({ data: null, error: null })
    mocks.retrieveTeamMember.mockResolvedValue(null)
    mocks.getAuthSession.mockResolvedValue({
      user: { id: 'user_operator', email: 'operator@example.com' },
    })
    mocks.isSignedSession.mockReturnValue(true)
    vi.clearAllMocks()
  })

  it('returns the signed-in session user', async () => {
    const result = await requireSession('/users?status=active')

    expect(result).toEqual({
      id: 'user_operator',
      email: 'operator@example.com',
    })
    expect(mocks.getAuthSession).toHaveBeenCalledTimes(1)
    expect(mocks.redirect).not.toHaveBeenCalled()
  })

  it('redirects an unsigned user to login with an encoded return path', async () => {
    mocks.isSignedSession.mockReturnValue(false)

    await expect(requireSession('/users?status=active')).rejects.toMatchObject({
      path: '/login?returnTo=%2Fusers%3Fstatus%3Dactive',
    })
    expect(mocks.redirect).toHaveBeenCalledTimes(1)
    expect(mocks.redirect).toHaveBeenCalledWith(
      '/login?returnTo=%2Fusers%3Fstatus%3Dactive'
    )
  })

  it('maps persisted Console team membership to access', async () => {
    mocks.retrieveTeamMember.mockResolvedValue(activeMember())

    const result = await findConsoleAccess(activeAccess.id)

    expect(result).toEqual(activeAccess)
    expect(mocks.retrieveTeamMember).toHaveBeenCalledTimes(1)
    expect(mocks.retrieveTeamMember).toHaveBeenCalledWith(activeAccess.id)
    expect(mocks.retrieveUser).not.toHaveBeenCalled()
  })

  it('returns null when no persisted Console access exists', async () => {
    const result = await findConsoleAccess('user_missing')

    expect(result).toBeNull()
    expect(mocks.retrieveTeamMember).toHaveBeenCalledTimes(1)
    expect(mocks.retrieveTeamMember).toHaveBeenCalledWith('user_missing')
    expect(mocks.retrieveUser).not.toHaveBeenCalled()
  })

  it('hydrates an authorized Console account with identity display fields', async () => {
    mocks.retrieveUser.mockResolvedValue({
      data: {
        first_name: 'Alejandra',
        last_name: 'Reyes',
        email: 'alejandra@example.com',
        avatar: 'https://cdn.example.com/avatar.png',
        status: 'active',
        banned: false,
      },
      error: null,
    })
    mocks.retrieveTeamMember.mockResolvedValue(activeMember())

    const result = await requireConsoleAccount(activeAccess.id)

    expect(result).toEqual({
      ...activeAccess,
      firstName: 'Alejandra',
      lastName: 'Reyes',
      email: 'alejandra@example.com',
      avatar: 'https://cdn.example.com/avatar.png',
      banned: false,
    })
    expect(mocks.retrieveUser).toHaveBeenCalledTimes(1)
    expect(mocks.redirect).not.toHaveBeenCalled()
  })

  it('signs a deleted account (user/not-found) out to /login', async () => {
    mocks.retrieveUser.mockResolvedValue({
      data: null,
      error: { code: 'user/not-found', message: 'No user.' },
    })
    mocks.retrieveTeamMember.mockResolvedValue(activeMember())

    await expect(requireConsoleAccount(activeAccess.id)).rejects.toMatchObject({
      path: '/login',
    })
  })

  it('signs a banned account out to /login', async () => {
    mocks.retrieveUser.mockResolvedValue({
      data: { status: 'active', banned: true },
      error: null,
    })
    mocks.retrieveTeamMember.mockResolvedValue(activeMember())

    await expect(requireConsoleAccount(activeAccess.id)).rejects.toMatchObject({
      path: '/login',
    })
  })

  it('signs a suspended platform account out to /login', async () => {
    mocks.retrieveUser.mockResolvedValue({
      data: { status: 'suspended', banned: false },
      error: null,
    })
    mocks.retrieveTeamMember.mockResolvedValue(activeMember())

    await expect(requireConsoleAccount(activeAccess.id)).rejects.toMatchObject({
      path: '/login',
    })
  })

  it('uses safe display defaults when identity hydration returns no data', async () => {
    mocks.retrieveTeamMember.mockResolvedValue(activeMember())

    const result = await requireConsoleAccount(activeAccess.id)

    expect(result).toEqual({
      ...activeAccess,
      firstName: null,
      lastName: null,
      email: '',
      avatar: null,
      banned: false,
    })
    expect(mocks.retrieveUser).toHaveBeenCalledTimes(1)
  })

  it('uses safe display defaults when identity hydration throws', async () => {
    mocks.retrieveUser.mockRejectedValueOnce(new Error('API unavailable'))
    mocks.retrieveTeamMember.mockResolvedValue(activeMember())

    const result = await requireConsoleAccount(activeAccess.id)

    expect(result).toEqual({
      ...activeAccess,
      firstName: null,
      lastName: null,
      email: '',
      avatar: null,
      banned: false,
    })
    expect(mocks.retrieveUser).toHaveBeenCalledTimes(1)
  })

  it('uses the verified session identity when API hydration is unavailable', async () => {
    mocks.retrieveTeamMember.mockResolvedValue(activeMember())

    const result = await requireConsoleAccount(activeAccess.id, {
      firstName: '  Alejandra ',
      lastName: ' Reyes  ',
      email: ' alejandra@example.com ',
    })

    expect(result).toEqual({
      ...activeAccess,
      firstName: 'Alejandra',
      lastName: 'Reyes',
      email: 'alejandra@example.com',
      avatar: null,
      banned: false,
    })
  })

  it('fills blank API identity fields from the verified session', async () => {
    mocks.retrieveUser.mockResolvedValue({
      data: {
        first_name: '',
        last_name: '',
        email: '',
        avatar: null,
        banned: false,
      },
      error: null,
    })
    mocks.retrieveTeamMember.mockResolvedValue(activeMember())

    const result = await requireConsoleAccount(activeAccess.id, {
      firstName: 'Alejandra',
      lastName: 'Reyes',
      email: 'alejandra@example.com',
    })

    expect(result).toMatchObject({
      firstName: 'Alejandra',
      lastName: 'Reyes',
      email: 'alejandra@example.com',
    })
  })

  it('redirects an account without a Console access grant', async () => {
    await expect(requireConsoleAccount('user_missing')).rejects.toMatchObject({
      path: '/access-denied?reason=no-account',
    })
    expect(mocks.redirect).toHaveBeenCalledTimes(1)
    expect(mocks.redirect).toHaveBeenCalledWith(
      '/access-denied?reason=no-account'
    )
    expect(mocks.retrieveUser).not.toHaveBeenCalled()
  })

  it('redirects a suspended Console account', async () => {
    mocks.retrieveTeamMember.mockResolvedValue(
      activeMember({ status: 'suspended' })
    )

    await expect(requireConsoleAccount(activeAccess.id)).rejects.toMatchObject({
      path: '/access-denied?reason=suspended',
    })
    expect(mocks.redirect).toHaveBeenCalledTimes(1)
    expect(mocks.redirect).toHaveBeenCalledWith(
      '/access-denied?reason=suspended'
    )
  })

  it('redirects an active account without Console entry permission', async () => {
    mocks.retrieveTeamMember.mockResolvedValue(
      activeMember({ role: { permissions: ['users:update'] } })
    )

    await expect(requireConsoleAccount(activeAccess.id)).rejects.toMatchObject({
      path: '/access-denied?reason=permission',
    })
    expect(mocks.redirect).toHaveBeenCalledTimes(1)
    expect(mocks.redirect).toHaveBeenCalledWith(
      '/access-denied?reason=permission'
    )
  })

  it('redirects an authorized account that lacks the requested permission', async () => {
    mocks.retrieveTeamMember.mockResolvedValue(
      activeMember({ role: { permissions: [CONSOLE_ACCESS_PERMISSION] } })
    )

    await expect(
      requireConsolePermission(activeAccess.id, 'users:delete')
    ).rejects.toMatchObject({ path: '/' })
    expect(mocks.redirect).toHaveBeenCalledTimes(1)
    expect(mocks.redirect).toHaveBeenCalledWith('/')
  })

  it('returns active access with the requested permission', async () => {
    mocks.retrieveTeamMember.mockResolvedValue(activeMember())

    const result = await requireConsolePermission(
      activeAccess.id,
      'users:update'
    )

    expect(result).toEqual(activeAccess)
    expect(mocks.redirect).not.toHaveBeenCalled()
  })
})
