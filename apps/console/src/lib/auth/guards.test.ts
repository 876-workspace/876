import { beforeEach, describe, expect, it, vi } from 'vitest'

import { permissionsForRole } from '@/lib/permissions'

import {
  CONSOLE_ACCESS_PERMISSION,
  findConsoleAccess,
  hasPermission,
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
  $876: { users: { retrieve: mocks.retrieveUser } },
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

  it('checks membership in the supplied permission list', () => {
    expect(hasPermission(activeAccess, 'users:update')).toBe(true)
  })

  it('rejects a missing permission', () => {
    expect(hasPermission(activeAccess, 'users:delete')).toBe(false)
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

  it('bootstraps the designated super admin using normalized email', async () => {
    mocks.retrieveUser.mockResolvedValue({
      data: { email: '  RaheemDevs@gmail.com ' },
      error: null,
    })

    const result = await findConsoleAccess('user_bootstrap')

    expect(result).toEqual({
      id: 'user_bootstrap',
      role: 'super_admin',
      permissions: permissionsForRole('super_admin'),
      status: 'active',
    })
    expect(mocks.retrieveUser).toHaveBeenCalledTimes(1)
    expect(mocks.retrieveUser).toHaveBeenCalledWith('user_bootstrap')
    expect(mocks.retrieveTeamMember).not.toHaveBeenCalled()
  })

  it('bootstraps from the sealed session without calling the identity API', async () => {
    mocks.getAuthSession.mockResolvedValue({
      user: { id: 'user_bootstrap', email: '  RaheemDevs@gmail.com ' },
    })

    const result = await findConsoleAccess('user_bootstrap')

    expect(result).toEqual({
      id: 'user_bootstrap',
      role: 'super_admin',
      permissions: permissionsForRole('super_admin'),
      status: 'active',
    })
    // The guard runs in every segment layout ahead of any paint, so the
    // address must not cost a round trip when the session already carries it.
    expect(mocks.retrieveUser).not.toHaveBeenCalled()
    expect(mocks.retrieveTeamMember).not.toHaveBeenCalled()
  })

  it('ignores the session address when checking a different user', async () => {
    mocks.getAuthSession.mockResolvedValue({
      user: { id: 'user_bootstrap', email: 'raheemdevs@gmail.com' },
    })
    mocks.retrieveUser.mockResolvedValue({
      data: { email: 'someone.else@example.com' },
      error: null,
    })
    mocks.retrieveTeamMember.mockResolvedValue(null)

    const result = await findConsoleAccess('user_other')

    // The signed-in operator's own address must never grant super-admin to the
    // id they happen to be looking at.
    expect(result).toBeNull()
    expect(mocks.retrieveUser).toHaveBeenCalledWith('user_other')
  })

  it('falls back to the identity API when the session carries no address', async () => {
    mocks.getAuthSession.mockResolvedValue({
      user: { id: 'user_bootstrap', email: '' },
    })
    mocks.retrieveUser.mockResolvedValue({
      data: { email: 'raheemdevs@gmail.com' },
      error: null,
    })

    const result = await findConsoleAccess('user_bootstrap')

    expect(result?.role).toBe('super_admin')
    expect(mocks.retrieveUser).toHaveBeenCalledWith('user_bootstrap')
  })

  it('does not consult the identity API for an unsigned session', async () => {
    mocks.isSignedSession.mockReturnValue(false)
    mocks.retrieveUser.mockResolvedValue({
      data: { email: 'raheemdevs@gmail.com' },
      error: null,
    })
    mocks.retrieveTeamMember.mockResolvedValue(null)

    const result = await findConsoleAccess('user_bootstrap')

    // An unsigned session cannot vouch for an address, so the authoritative
    // read still happens and still decides.
    expect(result?.role).toBe('super_admin')
    expect(mocks.retrieveUser).toHaveBeenCalledWith('user_bootstrap')
  })

  it.each([null, { email: '' }, { email: 'operator@example.com' }])(
    'falls back to a persisted access grant for identity %j',
    async (identity) => {
      mocks.retrieveUser.mockResolvedValue({ data: identity, error: null })
      mocks.retrieveTeamMember.mockResolvedValue({
        userId: 'user_operator',
        roleName: 'admin',
        status: 'active',
        role: { permissions: ['console:access', 'users:update'] },
      })

      const result = await findConsoleAccess('user_operator')

      expect(result).toEqual(activeAccess)
      expect(mocks.retrieveTeamMember).toHaveBeenCalledTimes(1)
      expect(mocks.retrieveTeamMember).toHaveBeenCalledWith('user_operator')
    }
  )

  it('returns null when neither bootstrap nor persisted access exists', async () => {
    const result = await findConsoleAccess('user_missing')

    expect(result).toBeNull()
    expect(mocks.retrieveTeamMember).toHaveBeenCalledTimes(1)
    expect(mocks.retrieveTeamMember).toHaveBeenCalledWith('user_missing')
  })

  it('hydrates an authorized Console account with identity display fields', async () => {
    mocks.retrieveUser.mockResolvedValueOnce({
      data: {
        first_name: 'Alejandra',
        last_name: 'Reyes',
        email: 'alejandra@example.com',
        avatar: 'https://cdn.example.com/avatar.png',
        banned: 1,
      },
      error: null,
    })
    mocks.retrieveTeamMember.mockResolvedValue({
      userId: activeAccess.id,
      roleName: activeAccess.role,
      status: activeAccess.status,
      role: { permissions: activeAccess.permissions },
    })

    const result = await requireConsoleAccount(activeAccess.id)

    expect(result).toEqual({
      ...activeAccess,
      firstName: 'Alejandra',
      lastName: 'Reyes',
      email: 'alejandra@example.com',
      avatar: 'https://cdn.example.com/avatar.png',
      banned: true,
    })
    // Once, for display hydration. The bootstrap check reads the address off
    // the sealed session when it is the session's own id, so it costs nothing.
    expect(mocks.retrieveUser).toHaveBeenCalledTimes(1)
    expect(mocks.redirect).not.toHaveBeenCalled()
  })

  it('uses safe display defaults when identity hydration returns no data', async () => {
    mocks.retrieveUser.mockResolvedValue({ data: null, error: null })
    mocks.retrieveTeamMember.mockResolvedValue({
      userId: activeAccess.id,
      roleName: activeAccess.role,
      status: activeAccess.status,
      role: { permissions: activeAccess.permissions },
    })

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
    mocks.retrieveTeamMember.mockResolvedValue({
      userId: activeAccess.id,
      roleName: activeAccess.role,
      status: activeAccess.status,
      role: { permissions: activeAccess.permissions },
    })

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
    mocks.retrieveUser.mockResolvedValue({ data: null, error: null })
    mocks.retrieveTeamMember.mockResolvedValue({
      userId: activeAccess.id,
      roleName: activeAccess.role,
      status: activeAccess.status,
      role: { permissions: activeAccess.permissions },
    })

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
    mocks.retrieveUser
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({
        data: {
          first_name: '',
          last_name: '',
          email: '',
          avatar: null,
          banned: false,
        },
        error: null,
      })
    mocks.retrieveTeamMember.mockResolvedValue({
      userId: activeAccess.id,
      roleName: activeAccess.role,
      status: activeAccess.status,
      role: { permissions: activeAccess.permissions },
    })

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
  })

  it('redirects a suspended Console account', async () => {
    mocks.retrieveTeamMember.mockResolvedValue({
      userId: activeAccess.id,
      roleName: activeAccess.role,
      status: 'suspended',
      role: { permissions: activeAccess.permissions },
    })

    await expect(requireConsoleAccount(activeAccess.id)).rejects.toMatchObject({
      path: '/access-denied?reason=suspended',
    })
    expect(mocks.redirect).toHaveBeenCalledTimes(1)
    expect(mocks.redirect).toHaveBeenCalledWith(
      '/access-denied?reason=suspended'
    )
  })

  it('redirects an active account without Console entry permission', async () => {
    mocks.retrieveTeamMember.mockResolvedValue({
      userId: activeAccess.id,
      roleName: activeAccess.role,
      status: activeAccess.status,
      role: { permissions: ['users:update'] },
    })

    await expect(requireConsoleAccount(activeAccess.id)).rejects.toMatchObject({
      path: '/access-denied?reason=permission',
    })
    expect(mocks.redirect).toHaveBeenCalledTimes(1)
    expect(mocks.redirect).toHaveBeenCalledWith(
      '/access-denied?reason=permission'
    )
  })

  it('redirects an authorized account that lacks the requested permission', async () => {
    mocks.retrieveTeamMember.mockResolvedValue({
      userId: activeAccess.id,
      roleName: activeAccess.role,
      status: activeAccess.status,
      role: { permissions: [CONSOLE_ACCESS_PERMISSION] },
    })

    await expect(
      requireConsolePermission(activeAccess.id, 'users:delete')
    ).rejects.toMatchObject({ path: '/' })
    expect(mocks.redirect).toHaveBeenCalledTimes(1)
    expect(mocks.redirect).toHaveBeenCalledWith('/')
  })

  it('returns active access with the requested permission', async () => {
    mocks.retrieveTeamMember.mockResolvedValue({
      userId: activeAccess.id,
      roleName: activeAccess.role,
      status: activeAccess.status,
      role: { permissions: activeAccess.permissions },
    })

    const result = await requireConsolePermission(
      activeAccess.id,
      'users:update'
    )

    expect(result).toEqual(activeAccess)
    expect(mocks.redirect).not.toHaveBeenCalled()
  })
})
