import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  requirePermission: vi.fn(),
  searchUsers: vi.fn(),
}))

vi.mock('@/lib/auth/route-guard', () => ({
  requireConsolePermission: mocks.requirePermission,
}))

vi.mock('@/lib/services/platform', () => ({
  platform: {
    users: {
      search: mocks.searchUsers,
    },
  },
}))

import { GET } from './route'

const context = { params: Promise.resolve({ id: 'org_target' }) }

function getRequest(query: string) {
  return new NextRequest(
    `http://console.test/api/organizations/org_target/members/search?q=${encodeURIComponent(query)}`
  )
}

describe('Console organization member candidate search route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.requirePermission.mockResolvedValue({
      sessionUser: { id: 'user_console_admin' },
      response: null,
    })
  })

  it('searches platform users with the organization Console permission', async () => {
    mocks.searchUsers.mockResolvedValue({
      data: {
        object: 'list',
        data: [{ id: 'user_target', email: 'member@example.com' }],
      },
      error: null,
    })

    const response = await GET(getRequest(' member@example.com '), context)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(mocks.requirePermission).toHaveBeenCalledWith(
      'console:organizations'
    )
    expect(mocks.searchUsers).toHaveBeenCalledTimes(1)
    expect(mocks.searchUsers).toHaveBeenCalledWith({
      query: 'member@example.com',
      limit: 10,
    })
    expect(body.data).toEqual([
      { id: 'user_target', email: 'member@example.com' },
    ])
  })

  it('does not search for fewer than two characters', async () => {
    const response = await GET(getRequest('a'), context)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.data).toEqual([])
    expect(mocks.searchUsers).not.toHaveBeenCalled()
  })

  it('short-circuits when Console authorization fails', async () => {
    const denied = new Response('forbidden', { status: 403 })
    mocks.requirePermission.mockResolvedValue({
      sessionUser: null,
      response: denied,
    })

    const response = await GET(getRequest('member@example.com'), context)

    expect(response).toBe(denied)
    expect(mocks.searchUsers).not.toHaveBeenCalled()
  })
})
