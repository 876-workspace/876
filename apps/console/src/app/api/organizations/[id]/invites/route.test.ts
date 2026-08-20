import type { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  requirePermission: vi.fn(),
  listInvites: vi.fn(),
  createInvite: vi.fn(),
  platformListInvites: vi.fn(),
  platformCreateInvite: vi.fn(),
}))

vi.mock('@/lib/auth/route-guard', () => ({
  requireConsolePermission: mocks.requirePermission,
}))

vi.mock('@/lib/876', () => ({
  $876: {
    invites: {
      list: mocks.platformListInvites,
      create: mocks.platformCreateInvite,
      admin: {
        list: mocks.listInvites,
        create: mocks.createInvite,
      },
    },
  },
}))

import { GET, POST } from './route'

const context = { params: Promise.resolve({ id: 'org_target' }) }

function postRequest(body: unknown) {
  return new Request('http://console.test/api/organizations/org_target/invites', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  }) as NextRequest
}

describe('Console organization invite route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.requirePermission.mockResolvedValue({
      sessionUser: { id: 'user_console_admin' },
      response: null,
    })
  })

  it('lists invites through the admin facade and unwraps the list', async () => {
    mocks.listInvites.mockResolvedValue({
      data: {
        object: 'list',
        data: [{ id: 'inv_01', email: 'member@example.com' }],
        has_more: false,
      },
      error: null,
    })

    const response = await GET(
      new Request('http://console.test') as NextRequest,
      context
    )
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.data).toEqual([
      { id: 'inv_01', email: 'member@example.com' },
    ])
    expect(mocks.listInvites).toHaveBeenCalledWith('org_target')
    expect(mocks.platformListInvites).not.toHaveBeenCalled()
  })

  it('creates an invite through the admin facade with normalized input', async () => {
    mocks.createInvite.mockResolvedValue({
      data: {
        object: 'invite_token',
        id: 'inv_01',
        email: 'new@example.com',
      },
      error: null,
    })

    const response = await POST(
      postRequest({ email: ' new@example.com ', role: ' member ' }),
      context
    )

    expect(response.status).toBe(201)
    expect(mocks.createInvite).toHaveBeenCalledTimes(1)
    expect(mocks.createInvite).toHaveBeenCalledWith('org_target', {
      email: 'new@example.com',
      role: 'member',
    })
    expect(mocks.platformCreateInvite).not.toHaveBeenCalled()
  })

  it('rejects a missing email before calling the facade', async () => {
    const response = await POST(postRequest({ role: 'member' }), context)

    expect(response.status).toBe(400)
    expect(mocks.createInvite).not.toHaveBeenCalled()
    expect(mocks.platformCreateInvite).not.toHaveBeenCalled()
  })
})
