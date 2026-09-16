import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  requireAccess: vi.fn(),
  listNotifications: vi.fn(),
}))

vi.mock('@/lib/auth/api-permission', () => ({
  requireApiAccess: mocks.requireAccess,
}))
vi.mock('@/lib/services/projects', () => ({
  projects: {
    notifications: { list: mocks.listNotifications },
  },
}))

const { GET } = await import('./route')

beforeEach(() => {
  vi.clearAllMocks()
  mocks.requireAccess.mockResolvedValue({
    response: null,
    orgId: 'org_1',
    userId: 'user_1',
  })
  mocks.listNotifications.mockResolvedValue({
    data: { object: 'list', data: [] },
    error: null,
  })
})

describe('GET /api/notifications', () => {
  it('requires the projects view permission', async () => {
    await GET()

    expect(mocks.requireAccess).toHaveBeenCalledWith({
      module: 'projects',
      permission: 'projects.view',
    })
  })

  it('scopes the list to the acting user rather than a query value', async () => {
    const response = await GET()

    expect(mocks.listNotifications).toHaveBeenCalledWith('org_1', 'user_1')
    expect(response.status).toBe(200)
  })

  it('returns 400 when the service fails', async () => {
    mocks.listNotifications.mockResolvedValue({
      data: null,
      error: { code: 'projects/unavailable', message: 'Down.' },
    })

    expect((await GET()).status).toBe(400)
  })
})
