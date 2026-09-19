import { beforeEach, describe, expect, it, vi } from 'vitest'

import { teamGrantUpdateSchema } from '@/types/team'

const mocks = vi.hoisted(() => ({
  guard: vi.fn(),
  deleteMember: vi.fn(),
  updateMember: vi.fn(),
  assertChange: vi.fn(),
}))

vi.mock('@/lib/auth/route-guard', () => ({
  requireConsolePermission: mocks.guard,
}))

vi.mock('@/lib/records', () => ({
  records: {
    team: { delete: mocks.deleteMember, update: mocks.updateMember },
  },
}))

vi.mock('@/lib/auth/role-change', () => ({
  assertTeamGrantChangeAllowed: mocks.assertChange,
}))

import { DELETE, PATCH } from './route'

function context(id = 'user_695d45c54a374ff0a570003e15668891') {
  return { params: Promise.resolve({ id }) }
}

describe('DELETE /api/team/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.guard.mockResolvedValue({
      caller: { id: 'user_operator', role: 'super-admin' },
      response: null,
    })
    mocks.deleteMember.mockResolvedValue({ count: 1 })
    mocks.updateMember.mockResolvedValue({
      data: { userId: 'user_target' },
      error: null,
    })
    mocks.assertChange.mockResolvedValue({ ok: true })
  })

  it('requires the team revoke permission', async () => {
    const response = await DELETE(
      new Request('https://console.test') as never,
      context()
    )

    expect(response.status).toBe(200)
    expect(mocks.guard).toHaveBeenCalledTimes(1)
    expect(mocks.guard).toHaveBeenCalledWith('team:revoke')
  })

  it('does not revoke when authorization returns a response', async () => {
    const denied = new Response(
      JSON.stringify({ error: { code: 'auth/forbidden' } }),
      {
        status: 403,
      }
    )
    mocks.guard.mockResolvedValue({ response: denied })

    const response = await DELETE(
      new Request('https://console.test') as never,
      context()
    )

    expect(response).toBe(denied)
    expect(response.status).toBe(403)
    expect(mocks.deleteMember).not.toHaveBeenCalled()
  })

  it('revokes the exact user id from the route params', async () => {
    const id = 'user_8b77bf6b62fb4b3f8dd3322c26b888aa'

    await DELETE(new Request('https://console.test') as never, context(id))

    expect(mocks.deleteMember).toHaveBeenCalledTimes(1)
    expect(mocks.deleteMember).toHaveBeenCalledWith(id)
    expect(mocks.assertChange).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'user_operator' }),
      id,
      { revoke: true }
    )
  })

  it('returns the exact deleted grant count', async () => {
    mocks.deleteMember.mockResolvedValue({ count: 1 })

    const response = await DELETE(
      new Request('https://console.test') as never,
      context()
    )

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ data: { count: 1 }, error: null })
  })

  it('returns zero when the grant was already absent', async () => {
    mocks.deleteMember.mockResolvedValue({ count: 0 })

    const response = await DELETE(
      new Request('https://console.test') as never,
      context()
    )

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ data: { count: 0 }, error: null })
  })

  it('calls the service exactly once for an authorized request', async () => {
    await DELETE(new Request('https://console.test') as never, context())

    expect(mocks.deleteMember).toHaveBeenCalledTimes(1)
    expect(mocks.guard).toHaveBeenCalledTimes(1)
  })

  it('updates grant details with the team update permission', async () => {
    const response = await PATCH(
      new Request('https://console.test', {
        method: 'PATCH',
        body: JSON.stringify({ affiliation: 'staff' }),
      }) as never,
      context('user_target')
    )

    expect(response.status).toBe(200)
    expect(mocks.guard).toHaveBeenCalledWith('team:update')
    expect(mocks.assertChange).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'user_operator' }),
      'user_target',
      { affiliation: 'staff' }
    )
    expect(mocks.updateMember).toHaveBeenCalledWith('user_target', {
      affiliation: 'staff',
    })
    expect(await response.json()).toEqual({
      data: { userId: 'user_target' },
      error: null,
    })
  })

  it('requires the separate suspension permission for a status change', async () => {
    await PATCH(
      new Request('https://console.test', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'suspended' }),
      }) as never,
      context('user_target')
    )

    expect(mocks.guard).toHaveBeenCalledWith('team:suspend')
    expect(mocks.updateMember).toHaveBeenCalledWith('user_target', {
      status: 'suspended',
    })
  })

  it('rejects malformed grant updates before authorizing or writing', async () => {
    const response = await PATCH(
      new Request('https://console.test', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'expired' }),
      }) as never,
      context()
    )

    expect(response.status).toBe(400)
    expect(mocks.guard).not.toHaveBeenCalled()
    expect(mocks.updateMember).not.toHaveBeenCalled()
  })

  it('rejects a non-assignable role before authorizing or writing', async () => {
    const response = await PATCH(
      new Request('https://console.test', {
        method: 'PATCH',
        body: JSON.stringify({ roleName: 'wizard' }),
      }) as never,
      context('user_target')
    )

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({
      data: null,
      error: {
        code: 'team/role-invalid',
        message: 'The requested role is not a valid assignable role.',
      },
    })
    expect(mocks.guard).not.toHaveBeenCalled()
    expect(mocks.assertChange).not.toHaveBeenCalled()
    expect(mocks.updateMember).not.toHaveBeenCalled()
  })

  it('normalizes the legacy super_admin role alias before updating', async () => {
    const response = await PATCH(
      new Request('https://console.test', {
        method: 'PATCH',
        body: JSON.stringify({ roleName: 'super_admin' }),
      }) as never,
      context('user_target')
    )

    expect(response.status).toBe(200)
    expect(mocks.assertChange).toHaveBeenCalledTimes(1)
    expect(mocks.assertChange).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'user_operator' }),
      'user_target',
      { roleName: 'super-admin' }
    )
    expect(mocks.updateMember).toHaveBeenCalledTimes(1)
    expect(mocks.updateMember).toHaveBeenCalledWith('user_target', {
      roleName: 'super-admin',
    })
  })

  it.each(['user', 'staff', 'admin', 'super-admin'] as const)(
    'accepts the assignable %s role in the grant update schema',
    (roleName) => {
      expect(teamGrantUpdateSchema.safeParse({ roleName })).toEqual({
        success: true,
        data: { roleName },
      })
    }
  )

  it('returns role-forbidden when a non-super-admin attempts escalation', async () => {
    mocks.guard.mockResolvedValue({
      caller: { id: 'user_operator', role: 'admin' },
      response: null,
    })
    mocks.assertChange.mockResolvedValue({
      ok: false,
      code: 'team/role-forbidden',
    })

    const response = await PATCH(
      new Request('https://console.test', {
        method: 'PATCH',
        body: JSON.stringify({ roleName: 'super-admin' }),
      }) as never,
      context('user_target')
    )

    expect(response.status).toBe(403)
    expect(await response.json()).toEqual({
      data: null,
      error: {
        code: 'team/role-forbidden',
        message: 'You do not have permission to assign this role.',
      },
    })
    expect(mocks.assertChange).toHaveBeenCalledTimes(1)
    expect(mocks.updateMember).not.toHaveBeenCalled()
  })

  it('does not delete a policy-protected grant', async () => {
    mocks.assertChange.mockResolvedValue({
      ok: false,
      code: 'team/self-access-protected',
    })

    const response = await DELETE(
      new Request('https://console.test') as never,
      context()
    )

    expect(response.status).toBe(403)
    expect(mocks.deleteMember).not.toHaveBeenCalled()
  })
})
