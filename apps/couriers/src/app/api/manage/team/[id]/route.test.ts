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

function patchRequest(body: string | Record<string, unknown>) {
  return new NextRequest('http://couriers.test/api/manage/team/tmem_123', {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })
}

function deleteRequest(url: string) {
  return new NextRequest(url, { method: 'DELETE' })
}

function ctx(
  role: 'owner' | 'admin' | 'member',
  tenant: { id: string } | null = { id: 'ten_123' }
) {
  return { orgId: 'org_123', orgSlug: 'island-logistics', role, tenant }
}

describe('Couriers team member route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getManageContext.mockResolvedValue(ctx('admin'))
    mocks.update.mockResolvedValue({
      data: {
        id: 'tmem_123',
        userId: 'usr_alejandra',
        roleId: 'role_staff',
        roleName: 'Staff',
        roleSystemKey: 'staff',
        status: 'inactive',
        createdAt: 1_784_419_200,
        updatedAt: 1_784_419_200,
      },
      error: null,
    })
    mocks.delete.mockResolvedValue({
      data: { id: 'tmem_123', deleted: true },
      error: null,
    })
  })

  describe('PATCH', () => {
    it('rejects malformed JSON without updating', async () => {
      const response = await PATCH(patchRequest('{invalid'), context)
      const body = await response.json()

      expect(response.status).toBe(422)
      expect(body.error.message).toBe('Invalid team member.')
      expect(mocks.getManageContext).not.toHaveBeenCalled()
      expect(mocks.update).not.toHaveBeenCalled()
    })

    it('rejects a missing orgSlug without updating', async () => {
      const response = await PATCH(
        patchRequest({ status: 'inactive' }),
        context
      )

      expect(response.status).toBe(422)
      expect(mocks.update).not.toHaveBeenCalled()
    })

    it('rejects an invalid status without updating', async () => {
      const response = await PATCH(
        patchRequest({
          orgSlug: 'island-logistics',
          status: 'suspended',
        }),
        context
      )

      expect(response.status).toBe(422)
      expect(mocks.update).not.toHaveBeenCalled()
    })

    it('returns 401 when there is no manage context', async () => {
      mocks.getManageContext.mockResolvedValue(null)

      const response = await PATCH(
        patchRequest({ orgSlug: 'island-logistics', status: 'inactive' }),
        context
      )

      expect(response.status).toBe(401)
      expect(mocks.update).not.toHaveBeenCalled()
    })

    it('forbids a plain member from updating users', async () => {
      mocks.getManageContext.mockResolvedValue(ctx('member'))

      const response = await PATCH(
        patchRequest({ orgSlug: 'island-logistics', status: 'inactive' }),
        context
      )
      const body = await response.json()

      expect(response.status).toBe(403)
      expect(body.error.code).toBe('auth/forbidden')
      expect(body.error.message).toBe(
        'You do not have permission to update users.'
      )
      expect(mocks.update).not.toHaveBeenCalled()
    })

    it('returns 404 when the tenant is missing', async () => {
      mocks.getManageContext.mockResolvedValue(ctx('admin', null))

      const response = await PATCH(
        patchRequest({ orgSlug: 'island-logistics', status: 'inactive' }),
        context
      )

      expect(response.status).toBe(404)
      expect(mocks.update).not.toHaveBeenCalled()
    })

    it('updates the tenant-scoped member with role and status', async () => {
      const response = await PATCH(
        patchRequest({
          orgSlug: 'island-logistics',
          roleId: 'role_staff',
          status: 'inactive',
        }),
        context
      )
      const body = await response.json()

      expect(response.status).toBe(200)
      expect(body.data.id).toBe('tmem_123')
      expect(body.data.status).toBe('inactive')
      expect(body.error).toBeNull()
      expect(mocks.update).toHaveBeenCalledTimes(1)
      expect(mocks.update).toHaveBeenCalledWith('ten_123', 'tmem_123', {
        roleId: 'role_staff',
        status: 'inactive',
      })
    })

    it('propagates the last-active-admin lockout from the service', async () => {
      mocks.update.mockResolvedValue({
        data: null,
        error:
          'The last active Admin team member cannot be removed or reassigned.',
        status: 400,
        code: 'team/last-active-admin',
      })

      const response = await PATCH(
        patchRequest({ orgSlug: 'island-logistics', status: 'inactive' }),
        context
      )
      const body = await response.json()

      expect(response.status).toBe(400)
      expect(body.error.code).toBe('team/last-active-admin')
      expect(body.data).toBeNull()
    })
  })

  describe('DELETE', () => {
    it('rejects a missing orgSlug without deleting', async () => {
      const response = await DELETE(
        deleteRequest('http://couriers.test/api/manage/team/tmem_123'),
        context
      )
      const body = await response.json()

      expect(response.status).toBe(422)
      expect(body.error.message).toBe('Organization is required.')
      expect(mocks.delete).not.toHaveBeenCalled()
    })

    it('returns 401 when there is no manage context', async () => {
      mocks.getManageContext.mockResolvedValue(null)

      const response = await DELETE(
        deleteRequest(
          'http://couriers.test/api/manage/team/tmem_123?orgSlug=island-logistics'
        ),
        context
      )

      expect(response.status).toBe(401)
      expect(mocks.delete).not.toHaveBeenCalled()
    })

    it('forbids a plain member from removing users', async () => {
      mocks.getManageContext.mockResolvedValue(ctx('member'))

      const response = await DELETE(
        deleteRequest(
          'http://couriers.test/api/manage/team/tmem_123?orgSlug=island-logistics'
        ),
        context
      )
      const body = await response.json()

      expect(response.status).toBe(403)
      expect(body.error.code).toBe('auth/forbidden')
      expect(mocks.delete).not.toHaveBeenCalled()
    })

    it('returns 404 when the tenant is missing', async () => {
      mocks.getManageContext.mockResolvedValue(ctx('owner', null))

      const response = await DELETE(
        deleteRequest(
          'http://couriers.test/api/manage/team/tmem_123?orgSlug=island-logistics'
        ),
        context
      )

      expect(response.status).toBe(404)
      expect(mocks.delete).not.toHaveBeenCalled()
    })

    it('deletes the tenant-scoped member and returns its tombstone', async () => {
      const response = await DELETE(
        deleteRequest(
          'http://couriers.test/api/manage/team/tmem_123?orgSlug=island-logistics'
        ),
        context
      )
      const body = await response.json()

      expect(response.status).toBe(200)
      expect(body.data).toEqual({ id: 'tmem_123', deleted: true })
      expect(body.error).toBeNull()
      expect(mocks.getManageContext).toHaveBeenCalledWith('island-logistics')
      expect(mocks.delete).toHaveBeenCalledTimes(1)
      expect(mocks.delete).toHaveBeenCalledWith('ten_123', 'tmem_123')
    })

    it('propagates not-found from the service', async () => {
      mocks.delete.mockResolvedValue({
        data: null,
        error: 'The requested team member was not found.',
        status: 404,
        code: 'team/not-found',
      })

      const response = await DELETE(
        deleteRequest(
          'http://couriers.test/api/manage/team/tmem_123?orgSlug=island-logistics'
        ),
        context
      )
      const body = await response.json()

      expect(response.status).toBe(404)
      expect(body.error.code).toBe('team/not-found')
      expect(body.data).toBeNull()
    })
  })
})
