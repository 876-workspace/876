import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  guard: vi.fn(),
  deleteMember: vi.fn(),
}))

vi.mock('@/lib/auth/route-guard', () => ({
  requireConsolePermission: mocks.guard,
}))

vi.mock('@/lib/service', () => ({
  service: { team: { delete: mocks.deleteMember } },
}))

import { DELETE } from './route'

function context(id = 'user_695d45c54a374ff0a570003e15668891') {
  return { params: Promise.resolve({ id }) }
}

describe('DELETE /api/team/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.guard.mockResolvedValue({ response: null })
    mocks.deleteMember.mockResolvedValue({ count: 1 })
  })

  it('requires the team revoke permission', async () => {
    const response = await DELETE(new Request('https://console.test') as never, context())

    expect(response.status).toBe(200)
    expect(mocks.guard).toHaveBeenCalledTimes(1)
    expect(mocks.guard).toHaveBeenCalledWith('team:revoke')
  })

  it('does not revoke when authorization returns a response', async () => {
    const denied = new Response(JSON.stringify({ error: { code: 'auth/forbidden' } }), {
      status: 403,
    })
    mocks.guard.mockResolvedValue({ response: denied })

    const response = await DELETE(new Request('https://console.test') as never, context())

    expect(response).toBe(denied)
    expect(response.status).toBe(403)
    expect(mocks.deleteMember).not.toHaveBeenCalled()
  })

  it('revokes the exact user id from the route params', async () => {
    const id = 'user_8b77bf6b62fb4b3f8dd3322c26b888aa'

    await DELETE(new Request('https://console.test') as never, context(id))

    expect(mocks.deleteMember).toHaveBeenCalledTimes(1)
    expect(mocks.deleteMember).toHaveBeenCalledWith(id)
  })

  it('returns the exact deleted grant count', async () => {
    mocks.deleteMember.mockResolvedValue({ count: 1 })

    const response = await DELETE(new Request('https://console.test') as never, context())

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ data: { count: 1 } })
  })

  it('returns zero when the grant was already absent', async () => {
    mocks.deleteMember.mockResolvedValue({ count: 0 })

    const response = await DELETE(new Request('https://console.test') as never, context())

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ data: { count: 0 } })
  })

  it('calls the service exactly once for an authorized request', async () => {
    await DELETE(new Request('https://console.test') as never, context())

    expect(mocks.deleteMember).toHaveBeenCalledTimes(1)
    expect(mocks.guard).toHaveBeenCalledTimes(1)
  })
})
