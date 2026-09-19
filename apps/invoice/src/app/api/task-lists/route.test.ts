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
vi.mock('@/lib/clients/work', () => ({ getWork: mocks.getWork }))

const PAGE = {
  object: 'list' as const,
  data: [
    {
      object: 'task_list' as const,
      id: 'list_1',
      organizationId: 'org_1',
      name: 'Inbox',
      description: 'Default organization task list.',
      ownerUserId: null,
      isDefault: true,
      sortOrder: 0,
      createdBy: 'user_1',
      createdAt: 100,
      updatedAt: 100,
    },
  ],
  has_more: false,
  total_count: 1,
  url: '/v1/organizations/org_1/task-lists',
}

describe('GET /api/task-lists', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mocks.requireWorkWidgetPermission.mockResolvedValue({
      response: null,
      orgId: 'org_1',
      userId: 'user_1',
    })
    mocks.getWork.mockResolvedValue({ taskLists: { list: mocks.list } })
    mocks.list.mockResolvedValue({ data: PAGE, error: null })
  })

  it('requires tasks.view before reading Work', async () => {
    await GET()

    expect(mocks.requireWorkWidgetPermission).toHaveBeenCalledWith('tasks.view')
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

  it('lists canonical organization task lists with a bounded page size', async () => {
    const response = await GET()
    const payload = await response.json()

    expect(mocks.list).toHaveBeenCalledWith('org_1', { limit: 100 })
    expect(response.status).toBe(200)
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
