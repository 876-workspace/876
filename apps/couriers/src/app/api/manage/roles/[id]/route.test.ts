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

function patchRequest(body: string | Record<string, unknown>) {
  return new NextRequest(
    'http://couriers.test/api/manage/roles/role_dispatcher',
    {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: typeof body === 'string' ? body : JSON.stringify(body),
    }
  )
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

describe('Couriers role route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getManageContext.mockResolvedValue(ctx('admin'))
    mocks.update.mockResolvedValue({
      data: { id: 'role_dispatcher', name: 'Dispatch' },
      error: null,
    })
    mocks.delete.mockResolvedValue({
      data: { id: 'role_dispatcher', deleted: true },
      error: null,
    })
  })

  describe('PATCH', () => {
    it('rejects malformed JSON without updating', async () => {
      const response = await PATCH(patchRequest('{invalid'), context)
      const body = await response.json()

      expect(response.status).toBe(422)
      expect(body.error.message).toBe('Invalid role.')
      expect(mocks.getManageContext).not.toHaveBeenCalled()
      expect(mocks.update).not.toHaveBeenCalled()
    })

    it('rejects a missing orgSlug without updating', async () => {
      const response = await PATCH(patchRequest({ name: 'Dispatch' }), context)

      expect(response.status).toBe(422)
      expect(mocks.update).not.toHaveBeenCalled()
    })

    it('returns 401 when there is no manage context', async () => {
      mocks.getManageContext.mockResolvedValue(null)

      const response = await PATCH(
        patchRequest({ orgSlug: 'island-logistics', name: 'Dispatch' }),
        context
      )
      const body = await response.json()

      expect(response.status).toBe(401)
      expect(body.error.message).toBe('Unauthorized.')
      expect(mocks.update).not.toHaveBeenCalled()
    })

    it('forbids a plain member from updating roles', async () => {
      mocks.getManageContext.mockResolvedValue(ctx('member'))

      const response = await PATCH(
        patchRequest({ orgSlug: 'island-logistics', name: 'Dispatch' }),
        context
      )
      const body = await response.json()

      expect(response.status).toBe(403)
      expect(body.error.code).toBe('auth/forbidden')
      expect(mocks.update).not.toHaveBeenCalled()
    })

    it('returns 404 when the tenant is missing', async () => {
      mocks.getManageContext.mockResolvedValue(ctx('owner', null))

      const response = await PATCH(
        patchRequest({ orgSlug: 'island-logistics', name: 'Dispatch' }),
        context
      )
      const body = await response.json()

      expect(response.status).toBe(404)
      expect(body.error.message).toBe('Tenant not found.')
      expect(mocks.update).not.toHaveBeenCalled()
    })

    it('updates the tenant-scoped role and returns the service payload', async () => {
      const response = await PATCH(
        patchRequest({
          orgSlug: 'island-logistics',
          name: 'Dispatch',
          permissions: ['packages.view'],
        }),
        context
      )
      const body = await response.json()

      expect(response.status).toBe(200)
      expect(body.data).toEqual({ id: 'role_dispatcher', name: 'Dispatch' })
      expect(body.error).toBeNull()
      expect(mocks.update).toHaveBeenCalledTimes(1)
      expect(mocks.update).toHaveBeenCalledWith('ten_123', 'role_dispatcher', {
        name: 'Dispatch',
        permissions: ['packages.view'],
      })
    })

    it('propagates default-role immutability from the service', async () => {
      mocks.update.mockResolvedValue({
        data: null,
        error: 'Default roles cannot be edited or deleted.',
        status: 400,
        code: 'role/default-immutable',
      })

      const response = await PATCH(
        patchRequest({ orgSlug: 'island-logistics', name: 'Crew' }),
        context
      )
      const body = await response.json()

      expect(response.status).toBe(400)
      expect(body.error.code).toBe('role/default-immutable')
      expect(body.data).toBeNull()
    })
  })

  describe('DELETE', () => {
    it('rejects a missing orgSlug without deleting', async () => {
      const response = await DELETE(
        deleteRequest('http://couriers.test/api/manage/roles/role_dispatcher'),
        context
      )
      const body = await response.json()

      expect(response.status).toBe(422)
      expect(body.error.message).toBe('Organization is required.')
      expect(mocks.getManageContext).not.toHaveBeenCalled()
      expect(mocks.delete).not.toHaveBeenCalled()
    })

    it('returns 401 when there is no manage context', async () => {
      mocks.getManageContext.mockResolvedValue(null)

      const response = await DELETE(
        deleteRequest(
          'http://couriers.test/api/manage/roles/role_dispatcher?orgSlug=island-logistics'
        ),
        context
      )

      expect(response.status).toBe(401)
      expect(mocks.delete).not.toHaveBeenCalled()
    })

    it('forbids a plain member from deleting roles', async () => {
      mocks.getManageContext.mockResolvedValue(ctx('member'))

      const response = await DELETE(
        deleteRequest(
          'http://couriers.test/api/manage/roles/role_dispatcher?orgSlug=island-logistics'
        ),
        context
      )
      const body = await response.json()

      expect(response.status).toBe(403)
      expect(body.error.code).toBe('auth/forbidden')
      expect(mocks.delete).not.toHaveBeenCalled()
    })

    it('returns 404 when the tenant is missing', async () => {
      mocks.getManageContext.mockResolvedValue(ctx('admin', null))

      const response = await DELETE(
        deleteRequest(
          'http://couriers.test/api/manage/roles/role_dispatcher?orgSlug=island-logistics'
        ),
        context
      )

      expect(response.status).toBe(404)
      expect(mocks.delete).not.toHaveBeenCalled()
    })

    it('deletes the tenant-scoped role and returns its tombstone', async () => {
      const response = await DELETE(
        deleteRequest(
          'http://couriers.test/api/manage/roles/role_dispatcher?orgSlug=island-logistics'
        ),
        context
      )
      const body = await response.json()

      expect(response.status).toBe(200)
      expect(body.data).toEqual({ id: 'role_dispatcher', deleted: true })
      expect(body.error).toBeNull()
      expect(mocks.getManageContext).toHaveBeenCalledWith('island-logistics')
      expect(mocks.delete).toHaveBeenCalledTimes(1)
      expect(mocks.delete).toHaveBeenCalledWith('ten_123', 'role_dispatcher')
    })

    it('propagates role-in-use conflicts from the service', async () => {
      mocks.delete.mockResolvedValue({
        data: null,
        error: 'Reassign all team members before deleting this role.',
        status: 409,
        code: 'role/in-use',
      })

      const response = await DELETE(
        deleteRequest(
          'http://couriers.test/api/manage/roles/role_dispatcher?orgSlug=island-logistics'
        ),
        context
      )
      const body = await response.json()

      expect(response.status).toBe(409)
      expect(body.error.code).toBe('role/in-use')
      expect(body.data).toBeNull()
    })
  })
})
