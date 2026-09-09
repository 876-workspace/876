import { beforeEach, describe, expect, it, vi } from 'vitest'

import { GET } from './route'

const mocks = vi.hoisted(() => ({
  requireWorkWidgetPermission: vi.fn(),
  getWork: vi.fn(),
  list: vi.fn(),
}))

vi.mock('@/lib/auth/work-widget-access', () => ({
  requireWorkWidgetPermission: mocks.requireWorkWidgetPermission,
}))
vi.mock('@/lib/services/work', () => ({ getWork: mocks.getWork }))

const PAGE = {
  object: 'list' as const,
  data: [],
  has_more: false,
  total_count: 0,
  url: '/v1/organizations/org_1/calendars',
}

describe('GET /api/calendars', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mocks.requireWorkWidgetPermission.mockResolvedValue({
      response: null,
      orgId: 'org_1',
      userId: 'user_1',
    })
    mocks.getWork.mockResolvedValue({ calendars: { list: mocks.list } })
    mocks.list.mockResolvedValue({ data: PAGE, error: null })
  })

  it('requires calendars.view before reading Work', async () => {
    await GET()

    expect(mocks.requireWorkWidgetPermission).toHaveBeenCalledWith(
      'calendars.view'
    )
  })

  it('returns access failures before creating a Work client', async () => {
    mocks.requireWorkWidgetPermission.mockResolvedValue({
      response: Response.json(
        {
          data: null,
          error: { code: 'auth/forbidden', message: 'Forbidden.' },
        },
        { status: 403 }
      ),
    })

    const response = await GET()

    expect(response.status).toBe(403)
    expect(mocks.getWork).not.toHaveBeenCalled()
  })

  it('lists only calendars visibly subscribed by the acting user', async () => {
    const response = await GET()
    const payload = await response.json()

    expect(mocks.list).toHaveBeenCalledWith('org_1', {
      userId: 'user_1',
      limit: 100,
    })
    expect(payload).toEqual({ data: PAGE, error: null })
  })

  it('sanitizes unknown upstream failures', async () => {
    mocks.list.mockResolvedValue({
      data: null,
      error: { code: 'provider/raw-error', message: 'provider detail' },
    })

    const response = await GET()
    const payload = await response.json()

    expect(response.status).toBe(502)
    expect(payload.error).toEqual({
      code: 'work/invalid-response',
      message: 'Work API returned an invalid response.',
    })
  })
})
