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
  service: { team: { update: mocks.update, delete: mocks.delete } },
}))

import { DELETE, PATCH } from './route'

const context = { params: Promise.resolve({ id: 'tmem_123' }) }

describe('Couriers team member route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getManageContext.mockResolvedValue({
      role: 'admin',
      tenant: { id: 'ten_123' },
    })
    mocks.update.mockResolvedValue({
      data: { id: 'tmem_123', status: 'inactive' },
      error: null,
    })
    mocks.delete.mockResolvedValue({
      data: { id: 'tmem_123', deleted: true },
      error: null,
    })
  })

  it('updates the tenant-scoped member', async () => {
    const response = await PATCH(
      new NextRequest('http://couriers.test/api/manage/team/tmem_123', {
        method: 'PATCH',
        body: JSON.stringify({
          orgSlug: 'island-logistics',
          status: 'inactive',
        }),
      }),
      context
    )

    expect(response.status).toBe(200)
    expect(mocks.update).toHaveBeenCalledWith('ten_123', 'tmem_123', {
      status: 'inactive',
    })
  })

  it('deletes the tenant-scoped member', async () => {
    const response = await DELETE(
      new NextRequest(
        'http://couriers.test/api/manage/team/tmem_123?orgSlug=island-logistics',
        { method: 'DELETE' }
      ),
      context
    )

    expect(response.status).toBe(200)
    expect(mocks.delete).toHaveBeenCalledWith('ten_123', 'tmem_123')
  })
})
