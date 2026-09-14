import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  getManageContext: vi.fn(),
  update: vi.fn(),
  del: vi.fn(),
}))

vi.mock('@/lib/auth/manage-context', () => ({
  getManageContext: mocks.getManageContext,
}))
vi.mock('@/lib/services/couriers', () => ({
  couriersOperator: {
    packageCategories: { update: mocks.update, delete: mocks.del },
  },
}))

import { getError } from '@/lib/errors'
import { DELETE, PATCH } from './route'

const context = { params: Promise.resolve({ id: 'pcat_fragile' }) }

function patchRequest(body: string | Record<string, unknown>) {
  return new NextRequest(
    'http://couriers.test/api/manage/package-categories/pcat_fragile',
    {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: typeof body === 'string' ? body : JSON.stringify(body),
    }
  )
}

function deleteRequest(orgSlug: string | null) {
  const url =
    orgSlug === null
      ? 'http://couriers.test/api/manage/package-categories/pcat_fragile'
      : `http://couriers.test/api/manage/package-categories/pcat_fragile?orgSlug=${orgSlug}`
  return new NextRequest(url, { method: 'DELETE' })
}

function ctx(
  role: 'super-admin' | 'admin' | 'staff',
  tenant: { id: string } | null = { id: 'ten_123' },
  accessStatus: 'active' | 'blocked' = 'active'
) {
  return {
    orgId: 'org_123',
    orgSlug: 'island-logistics',
    role,
    tenant,
    accessStatus,
  }
}

const updatedCategory = {
  object: 'package_category',
  id: 'pcat_fragile',
  tenant_id: 'ten_123',
  provisioning_key: null,
  name: 'Extra Fragile',
  slug: 'fragile',
  description: null,
  icon: null,
  sort_order: 10,
  is_active: true,
  created_at: 1_784_419_200,
  updated_at: 1_784_505_600,
  deleted_at: null,
}

describe('Couriers package category route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getManageContext.mockResolvedValue(ctx('admin'))
    mocks.update.mockResolvedValue({ data: updatedCategory, error: null })
    mocks.del.mockResolvedValue({
      data: {
        object: 'package_category',
        id: 'pcat_fragile',
        deleted: true,
      },
      error: null,
    })
  })

  describe('PATCH', () => {
    it('rejects malformed JSON without resolving context or updating', async () => {
      const response = await PATCH(patchRequest('{invalid'), context)
      const body = await response.json()

      expect(response.status).toBe(422)
      expect(body).toEqual({
        data: null,
        error: {
          code: 'request/invalid',
          message: getError('request/invalid').message,
        },
      })
      expect(mocks.getManageContext).not.toHaveBeenCalled()
      expect(mocks.update).not.toHaveBeenCalled()
    })

    it('rejects a missing orgSlug without updating', async () => {
      const response = await PATCH(
        patchRequest({ name: 'Extra Fragile' }),
        context
      )

      expect(response.status).toBe(422)
      expect(mocks.update).not.toHaveBeenCalled()
    })

    it('returns 401 when there is no manage context', async () => {
      mocks.getManageContext.mockResolvedValue(null)

      const response = await PATCH(
        patchRequest({ orgSlug: 'island-logistics', name: 'Extra Fragile' }),
        context
      )
      const body = await response.json()

      expect(response.status).toBe(401)
      expect(body.error.code).toBe('auth/no-session')
      expect(mocks.update).not.toHaveBeenCalled()
    })

    it('returns 403 without updating when the account is on hold', async () => {
      mocks.getManageContext.mockResolvedValue(
        ctx('admin', { id: 'ten_123' }, 'blocked')
      )

      const response = await PATCH(
        patchRequest({ orgSlug: 'island-logistics', name: 'Extra Fragile' }),
        context
      )
      const body = await response.json()

      expect(response.status).toBe(403)
      expect(body.error.code).toBe('auth/account-on-hold')
      expect(mocks.update).not.toHaveBeenCalled()
    })

    it('forbids staff without updating', async () => {
      mocks.getManageContext.mockResolvedValue(ctx('staff'))

      const response = await PATCH(
        patchRequest({ orgSlug: 'island-logistics', name: 'Extra Fragile' }),
        context
      )

      expect(response.status).toBe(403)
      expect(mocks.update).not.toHaveBeenCalled()
    })

    it('returns 404 when the tenant has not been provisioned', async () => {
      mocks.getManageContext.mockResolvedValue(ctx('admin', null))

      const response = await PATCH(
        patchRequest({ orgSlug: 'island-logistics', name: 'Extra Fragile' }),
        context
      )

      expect(response.status).toBe(404)
      expect(mocks.update).not.toHaveBeenCalled()
    })

    it('rejects a provisioning_key in the body without updating', async () => {
      const response = await PATCH(
        patchRequest({
          orgSlug: 'island-logistics',
          provisioning_key: 'fragile',
        }),
        context
      )
      const body = await response.json()

      expect(response.status).toBe(422)
      expect(body.error.code).toBe('request/invalid')
      expect(mocks.update).not.toHaveBeenCalled()
    })

    it('propagates the operator not-found code', async () => {
      mocks.update.mockResolvedValue({
        data: null,
        error: { code: 'package-category/not-found' },
      })

      const response = await PATCH(
        patchRequest({ orgSlug: 'island-logistics', name: 'Extra Fragile' }),
        context
      )
      const body = await response.json()

      expect(response.status).toBe(404)
      expect(body).toEqual({
        data: null,
        error: {
          code: 'package-category/not-found',
          message: getError('package-category/not-found').message,
        },
      })
    })

    it('updates a tenant-scoped category and returns the exact envelope', async () => {
      const response = await PATCH(
        patchRequest({
          orgSlug: 'island-logistics',
          name: 'Extra Fragile',
          description: null,
        }),
        context
      )
      const body = await response.json()

      expect(response.status).toBe(200)
      expect(body).toEqual({ data: updatedCategory, error: null })
      expect(mocks.update).toHaveBeenCalledTimes(1)
      expect(mocks.update).toHaveBeenCalledWith('ten_123', 'pcat_fragile', {
        name: 'Extra Fragile',
        description: null,
      })
    })
  })

  describe('DELETE', () => {
    it('rejects a missing orgSlug without archiving', async () => {
      const response = await DELETE(deleteRequest(null), context)
      const body = await response.json()

      expect(response.status).toBe(422)
      expect(body.error.code).toBe('request/invalid')
      expect(mocks.getManageContext).not.toHaveBeenCalled()
      expect(mocks.del).not.toHaveBeenCalled()
    })

    it('returns 401 when there is no manage context', async () => {
      mocks.getManageContext.mockResolvedValue(null)

      const response = await DELETE(deleteRequest('island-logistics'), context)
      const body = await response.json()

      expect(response.status).toBe(401)
      expect(body.error.code).toBe('auth/no-session')
      expect(mocks.del).not.toHaveBeenCalled()
    })

    it('forbids staff without archiving', async () => {
      mocks.getManageContext.mockResolvedValue(ctx('staff'))

      const response = await DELETE(deleteRequest('island-logistics'), context)

      expect(response.status).toBe(403)
      expect(mocks.del).not.toHaveBeenCalled()
    })

    it('returns 404 when the tenant has not been provisioned', async () => {
      mocks.getManageContext.mockResolvedValue(ctx('admin', null))

      const response = await DELETE(deleteRequest('island-logistics'), context)

      expect(response.status).toBe(404)
      expect(mocks.del).not.toHaveBeenCalled()
    })

    it('propagates the operator not-found code', async () => {
      mocks.del.mockResolvedValue({
        data: null,
        error: { code: 'package-category/not-found' },
      })

      const response = await DELETE(deleteRequest('island-logistics'), context)
      const body = await response.json()

      expect(response.status).toBe(404)
      expect(body.error.code).toBe('package-category/not-found')
    })

    it('archives a tenant-scoped category and returns the exact envelope', async () => {
      const response = await DELETE(deleteRequest('island-logistics'), context)
      const body = await response.json()

      expect(response.status).toBe(200)
      expect(body).toEqual({
        data: {
          object: 'package_category',
          id: 'pcat_fragile',
          deleted: true,
        },
        error: null,
      })
      expect(mocks.getManageContext).toHaveBeenCalledTimes(1)
      expect(mocks.getManageContext).toHaveBeenCalledWith('island-logistics')
      expect(mocks.del).toHaveBeenCalledTimes(1)
      expect(mocks.del).toHaveBeenCalledWith('ten_123', 'pcat_fragile')
    })
  })
})
