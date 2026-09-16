import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  requireAccess: vi.fn(),
  markRead: vi.fn(),
}))

vi.mock('@/lib/auth/api-permission', () => ({
  requireApiAccess: mocks.requireAccess,
}))
vi.mock('@/lib/services/projects', () => ({
  projects: {
    notifications: { markRead: mocks.markRead },
  },
}))

const { POST } = await import('./route')

const context = { params: Promise.resolve({ notificationId: 'ntf_1' }) }

function request() {
  return new NextRequest('http://localhost/api/notifications/ntf_1/read', {
    method: 'POST',
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.requireAccess.mockResolvedValue({
    response: null,
    orgId: 'org_1',
    userId: 'user_1',
  })
  mocks.markRead.mockResolvedValue({
    data: { object: 'projects.notification', id: 'ntf_1' },
    error: null,
  })
})

describe('POST /api/notifications/[notificationId]/read', () => {
  it('requires the projects view permission', async () => {
    await POST(request(), context)

    expect(mocks.requireAccess).toHaveBeenCalledWith({
      module: 'projects',
      permission: 'projects.view',
    })
  })

  it('marks the notification read', async () => {
    const response = await POST(request(), context)

    expect(mocks.markRead).toHaveBeenCalledWith('org_1', 'ntf_1')
    expect(response.status).toBe(200)
  })

  it('returns 404 for an unknown notification', async () => {
    mocks.markRead.mockResolvedValue({
      data: null,
      error: {
        code: 'projects/notification-not-found',
        message: 'Missing.',
      },
    })

    expect((await POST(request(), context)).status).toBe(404)
  })
})
