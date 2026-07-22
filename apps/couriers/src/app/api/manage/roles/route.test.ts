import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getManageContext: vi.fn(),
  create: vi.fn(),
}))

vi.mock('@/lib/auth/manage-context', () => ({
  getManageContext: mocks.getManageContext,
}))
vi.mock('@/lib/service', () => ({
  service: { roles: { create: mocks.create } },
}))

import { POST } from './route'

describe('Couriers roles create route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getManageContext.mockResolvedValue({
      role: 'owner',
      tenant: { id: 'ten_123' },
    })
    mocks.create.mockResolvedValue({
      data: { id: 'role_dispatcher', name: 'Dispatcher' },
      error: null,
    })
  })

  it('creates a tenant-scoped role', async () => {
    const response = await POST(
      new Request('http://couriers.test/api/manage/roles', {
        method: 'POST',
        body: JSON.stringify({
          orgSlug: 'island-logistics',
          name: 'Dispatcher',
          description: 'Dispatch access',
          permissions: ['packages.view'],
        }),
      }) as never
    )

    expect(response.status).toBe(201)
    expect(mocks.create).toHaveBeenCalledWith('ten_123', {
      name: 'Dispatcher',
      description: 'Dispatch access',
      permissions: ['packages.view'],
    })
  })
})
