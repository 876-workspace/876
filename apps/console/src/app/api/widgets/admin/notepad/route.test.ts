import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  requirePermission: vi.fn(),
  list: vi.fn(),
}))

vi.mock('@/lib/auth/route-guard', () => ({
  requireConsolePermission: mocks.requirePermission,
}))

vi.mock('@/lib/widgets', () => ({
  $widgetsAdmin: {
    notes: {
      list: mocks.list,
    },
  },
}))

import { GET } from './route'

describe('Console notepad admin collection route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.requirePermission.mockResolvedValue({
      sessionUser: { id: 'user_console_admin' },
      response: null,
    })
  })

  it('when the caller has console:widgets, then lists all notes as admin', async () => {
    mocks.list.mockResolvedValue({
      data: {
        object: 'list',
        data: [],
        has_more: false,
        url: '/v1/admin/notes',
        total_count: null,
      },
      error: null,
    })

    const response = await GET(
      new Request(
        'http://console.test/api/widgets/admin/notepad?owner_account_id=user_target&limit=50'
      )
    )

    expect(response.status).toBe(200)
    expect(mocks.requirePermission).toHaveBeenCalledWith('console:widgets')
    expect(mocks.list).toHaveBeenCalledWith(
      { userId: 'user_console_admin' },
      {
        owner_account_id: 'user_target',
        limit: 50,
        starting_after: undefined,
      }
    )
  })

  it('when permission is denied, then does not call the widgets admin API', async () => {
    mocks.requirePermission.mockResolvedValue({
      sessionUser: null,
      response: Response.json({ error: 'Forbidden.' }, { status: 403 }),
    })

    const response = await GET(
      new Request('http://console.test/api/widgets/admin/notepad')
    )

    expect(response.status).toBe(403)
    expect(mocks.list).not.toHaveBeenCalled()
  })

  it('when the widgets admin list fails, then returns 502', async () => {
    mocks.list.mockResolvedValue({
      data: null,
      error: {
        code: 'widgets/network-error',
        message: 'Unable to reach the Widgets API.',
      },
    })

    const response = await GET(
      new Request('http://console.test/api/widgets/admin/notepad')
    )

    expect(response.status).toBe(502)
  })
})
