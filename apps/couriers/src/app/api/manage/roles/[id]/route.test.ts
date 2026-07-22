import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  getManageContext: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
}))

vi.mock('@/lib/auth/manage-context', () => ({
  getManageContext: mocks.getManageContext,
}))
vi.mock('@/lib/service', () => ({
  service: { roles: { update: mocks.update, delete: mocks.delete } },
}))

import { DELETE, PATCH } from './route'

const context = { params: Promise.resolve({ id: 'role_dispatcher' }) }

describe('Couriers role route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getManageContext.mockResolvedValue({
      role: 'admin',
      tenant: { id: 'ten_123' },
    })
    mocks.update.mockResolvedValue({
      data: { id: 'role_dispatcher', name: 'Dispatch' },
      error: null,
    })
    mocks.delete.mockResolvedValue({
      data: { id: 'role_dispatcher', deleted: true },
      error: null,
    })
  })

  it('updates the tenant-scoped role', async () => {
    const response = await PATCH(
      new NextRequest('http://couriers.test/api/manage/roles/role_dispatcher', {
        method: 'PATCH',
        body: JSON.stringify({
          orgSlug: 'island-logistics',
          name: 'Dispatch',
        }),
      }),
      context
    )

    expect(response.status).toBe(200)
    expect(mocks.update).toHaveBeenCalledWith('ten_123', 'role_dispatcher', {
      name: 'Dispatch',
    })
  })

  it('deletes the tenant-scoped role', async () => {
    const response = await DELETE(
      new NextRequest(
        'http://couriers.test/api/manage/roles/role_dispatcher?orgSlug=island-logistics',
        { method: 'DELETE' }
      ),
      context
    )

    expect(response.status).toBe(200)
    expect(mocks.delete).toHaveBeenCalledWith('ten_123', 'role_dispatcher')
  })
})
