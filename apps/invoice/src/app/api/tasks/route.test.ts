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
  url: '/v1/organizations/org_1/tasks',
}

function request(query = '') {
  return new Request(`http://invoice.test/api/tasks${query}`)
}

describe('GET /api/tasks', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mocks.requireWorkWidgetPermission.mockResolvedValue({
      response: null,
      orgId: 'org_1',
      userId: 'user_1',
    })
    mocks.getWork.mockResolvedValue({ tasks: { list: mocks.list } })
    mocks.list.mockResolvedValue({ data: PAGE, error: null })
  })

  it('requires tasks.view before reading Work', async () => {
    await GET(request())

    expect(mocks.requireWorkWidgetPermission).toHaveBeenCalledWith('tasks.view')
  })

  it('returns access failures before creating a Work client', async () => {
    mocks.requireWorkWidgetPermission.mockResolvedValue({
      response: Response.json(
        { data: null, error: { code: 'auth/forbidden', message: 'Forbidden.' } },
        { status: 403 }
      ),
    })

    const response = await GET(request())

    expect(response.status).toBe(403)
    expect(mocks.getWork).not.toHaveBeenCalled()
  })

  it('always scopes task reads to the acting user', async () => {
    const response = await GET(request())
    const payload = await response.json()

    expect(mocks.list).toHaveBeenCalledWith('org_1', {
      assigneeId: 'user_1',
      limit: 100,
    })
    expect(response.status).toBe(200)
    expect(payload).toEqual({ data: PAGE, error: null })
  })

  it('accepts an optional canonical task-list filter', async () => {
    await GET(request('?listId=list_1'))

    expect(mocks.list).toHaveBeenCalledWith('org_1', {
      assigneeId: 'user_1',
      listId: 'list_1',
      limit: 100,
    })
  })

  it('rejects a blank task-list filter', async () => {
    const response = await GET(request('?listId=%20%20'))
    const payload = await response.json()

    expect(response.status).toBe(422)
    expect(payload.error.code).toBe('work/invalid-request')
    expect(mocks.getWork).not.toHaveBeenCalled()
  })

  it('sanitizes unknown upstream task-list failures', async () => {
    mocks.list.mockResolvedValue({
      data: null,
      error: { code: 'provider/raw-error', message: 'provider detail' },
    })

    const response = await GET(request())
    const payload = await response.json()

    expect(response.status).toBe(502)
    expect(payload.error).toEqual({
      code: 'work/invalid-response',
      message: 'Work API returned an invalid response.',
    })
  })
})