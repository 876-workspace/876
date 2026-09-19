import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  getManageContext: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  getCouriers: vi.fn(),
  couriersErrorStatus: vi.fn((error: { code: string }) => {
    if (error.code.endsWith('/not-found')) return 404
    return error.code === 'team/last-active-admin' ? 400 : 409
  }),
}))

vi.mock('@/lib/auth/manage-context', () => ({
  getManageContext: mocks.getManageContext,
}))
vi.mock('@/lib/clients/couriers', () => ({
  getCouriers: mocks.getCouriers,
}))
vi.mock('@/lib/couriers', () => ({
  couriersErrorStatus: mocks.couriersErrorStatus,
  toTeamMemberView: (member: Record<string, unknown>) => member,
}))

import { getError } from '@/lib/errors'
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
  role: 'super-admin' | 'admin' | 'staff',
  tenant: { id: string } | null = { id: 'ten_123' }
) {
  return { orgId: 'org_123', orgSlug: 'island-logistics', role, tenant }
}

describe('Couriers team member route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getCouriers.mockImplementation(() => ({
      memberships: { update: mocks.update, delete: mocks.delete },
    }))
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
      data: { object: 'team_member', id: 'tmem_123', deleted: true },
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
      mocks.getManageContext.mockResolvedValue(ctx('staff'))

      const response = await PATCH(
        patchRequest({ orgSlug: 'island-logistics', status: 'inactive' }),
        context
      )
      const body = await response.json()

      expect(response.status).toBe(403)
      expect(body.error).toEqual({
        code: 'auth/forbidden',
        message: getError('auth/forbidden').message,
      })
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
      expect(mocks.update).toHaveBeenCalledWith('tmem_123', {
        role_id: 'role_staff',
        status: 'inactive',
      })
    })

    it('propagates the last-active-admin lockout from the service', async () => {
      mocks.update.mockResolvedValue({
        data: null,
        error: {
          code: 'team/last-active-admin',
          message:
            'The last active Admin team member cannot be removed or reassigned.',
        },
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
      mocks.getManageContext.mockResolvedValue(ctx('staff'))

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
      mocks.getManageContext.mockResolvedValue(ctx('super-admin', null))

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
      expect(mocks.delete).toHaveBeenCalledWith('tmem_123')
    })

    it('propagates not-found from the service', async () => {
      mocks.delete.mockResolvedValue({
        data: null,
        error: {
          code: 'team/not-found',
          message: 'The requested team member was not found.',
        },
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
