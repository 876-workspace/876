import { describe, expect, it, vi } from 'vitest'

import { buildAdminRuntime } from '../runtime'
import { createRolesResource } from './roles'

const baseUrl = 'https://couriers.example.test'
const apiKey = '876_app_secret_couriers'
const internalKey = 'couriers_internal_key'

function createRoleFixture(overrides: Record<string, unknown> = {}) {
  return {
    object: 'role' as const,
    id: 'role_kgn_4d2a1f8e',
    tenant_id: 'ten_kgn_7f3a9b2c',
    name: 'Dispatch Supervisor',
    description: 'Oversees daily dispatch and Kingston route assignments',
    permissions: ['roles.read', 'team.read', 'packages.read'],
    is_default: false,
    system_key: null,
    member_count: 3,
    created_at: 1710000000,
    updated_at: 1710000000,
    ...overrides,
  }
}

function createRoleListFixture(tenantId = 'ten_kgn_7f3a9b2c') {
  const role = createRoleFixture({ tenant_id: tenantId })
  return {
    object: 'list' as const,
    data: [role],
    has_more: false,
    total_count: 1,
    url: `/v1/tenants/${tenantId}/roles`,
  }
}

describe('admin roles resource', () => {
  describe('list', () => {
    it('lists roles for a Kingston tenant', async () => {
      const tenantId = 'ten/kgn 001'
      const fixture = createRoleListFixture(tenantId)
      const fetchMock = vi
        .fn<typeof fetch>()
        .mockResolvedValue(Response.json({ data: fixture, error: null }))
      const runtime = buildAdminRuntime({
        baseUrl,
        apiKey,
        internalKey,
        fetch: fetchMock,
      })
      const resource = createRolesResource(runtime)

      const result = await resource.list(tenantId)

      expect(result).toEqual({ data: fixture, error: null })
      expect(fetchMock).toHaveBeenCalledTimes(1)
      expect(fetchMock).toHaveBeenCalledWith(
        `https://couriers.example.test/v1/tenants/${encodeURIComponent(tenantId)}/roles`,
        expect.objectContaining({ method: 'GET' })
      )
    })

    it('rejects malformed response bodies', async () => {
      const fetchMock = vi
        .fn<typeof fetch>()
        .mockResolvedValue(
          Response.json({ data: { object: 'role', id: 'role_1' }, error: null })
        )
      const runtime = buildAdminRuntime({
        baseUrl,
        apiKey,
        internalKey,
        fetch: fetchMock,
      })
      const resource = createRolesResource(runtime)

      const result = await resource.list('ten_kgn_7f3a9b2c')

      expect(result).toEqual({
        data: null,
        error: expect.objectContaining({ code: 'couriers/invalid-response' }),
      })
      expect(fetchMock).toHaveBeenCalledTimes(1)
    })

    it('fails closed without admin credential before fetch', async () => {
      const fetchMock = vi.fn<typeof fetch>()
      const runtime = buildAdminRuntime({
        baseUrl,
        apiKey,
        internalKey: '',
        fetch: fetchMock,
      })
      const resource = createRolesResource(runtime)

      const result = await resource.list('ten_kgn_7f3a9b2c')

      expect(result).toEqual({
        data: null,
        error: expect.objectContaining({
          code: 'couriers/admin-not-configured',
        }),
      })
      expect(fetchMock).not.toHaveBeenCalled()
    })
  })

  describe('create', () => {
    it('creates a Warehouse Clerk role for a Kingston tenant', async () => {
      const tenantId = 'ten/kgn 001'
      const body = {
        name: 'Warehouse Clerk',
        description: 'Handles intake and shelf assignment at Half Way Tree',
        permissions: ['packages.read', 'warehouses.read'],
      }
      const fixture = createRoleFixture({
        id: 'role_kgn_9b1c2d3e',
        tenant_id: tenantId,
        name: body.name,
        description: body.description,
        permissions: body.permissions,
      })
      const fetchMock = vi
        .fn<typeof fetch>()
        .mockResolvedValue(Response.json({ data: fixture, error: null }))
      const runtime = buildAdminRuntime({
        baseUrl,
        apiKey,
        internalKey,
        fetch: fetchMock,
      })
      const resource = createRolesResource(runtime)

      const result = await resource.create(tenantId, body)

      expect(result).toEqual({ data: fixture, error: null })
      expect(fetchMock).toHaveBeenCalledTimes(1)
      expect(fetchMock).toHaveBeenCalledWith(
        `https://couriers.example.test/v1/tenants/${encodeURIComponent(tenantId)}/roles`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(body),
        })
      )
    })

    it('rejects malformed response bodies', async () => {
      const fetchMock = vi
        .fn<typeof fetch>()
        .mockResolvedValue(
          Response.json({ data: { object: 'role' }, error: null })
        )
      const runtime = buildAdminRuntime({
        baseUrl,
        apiKey,
        internalKey,
        fetch: fetchMock,
      })
      const resource = createRolesResource(runtime)

      const result = await resource.create('ten_kgn_7f3a9b2c', {
        name: 'Counter Agent',
        permissions: ['packages.read'],
      })

      expect(result).toEqual({
        data: null,
        error: expect.objectContaining({ code: 'couriers/invalid-response' }),
      })
      expect(fetchMock).toHaveBeenCalledTimes(1)
    })

    it('fails closed without admin credential before fetch', async () => {
      const fetchMock = vi.fn<typeof fetch>()
      const runtime = buildAdminRuntime({
        baseUrl,
        apiKey,
        internalKey: '',
        fetch: fetchMock,
      })
      const resource = createRolesResource(runtime)

      const result = await resource.create('ten_kgn_7f3a9b2c', {
        name: 'Counter Agent',
        permissions: ['packages.read'],
      })

      expect(result).toEqual({
        data: null,
        error: expect.objectContaining({
          code: 'couriers/admin-not-configured',
        }),
      })
      expect(fetchMock).not.toHaveBeenCalled()
    })
  })

  describe('update', () => {
    it('updates a Delivery Driver role', async () => {
      const tenantId = 'ten/kgn 001'
      const roleId = 'role/kgn 002'
      const body = {
        name: 'Senior Delivery Driver',
        permissions: ['deliveries.read', 'deliveries.write'],
      }
      const fixture = createRoleFixture({
        id: roleId,
        tenant_id: tenantId,
        name: body.name,
        permissions: body.permissions,
      })
      const fetchMock = vi
        .fn<typeof fetch>()
        .mockResolvedValue(Response.json({ data: fixture, error: null }))
      const runtime = buildAdminRuntime({
        baseUrl,
        apiKey,
        internalKey,
        fetch: fetchMock,
      })
      const resource = createRolesResource(runtime)

      const result = await resource.update(tenantId, roleId, body)

      expect(result).toEqual({ data: fixture, error: null })
      expect(fetchMock).toHaveBeenCalledTimes(1)
      expect(fetchMock).toHaveBeenCalledWith(
        `https://couriers.example.test/v1/tenants/${encodeURIComponent(tenantId)}/roles/${encodeURIComponent(roleId)}`,
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify(body),
        })
      )
    })

    it('rejects malformed response bodies', async () => {
      const fetchMock = vi
        .fn<typeof fetch>()
        .mockResolvedValue(
          Response.json({ data: { id: 'role_kgn_4d2a1f8e' }, error: null })
        )
      const runtime = buildAdminRuntime({
        baseUrl,
        apiKey,
        internalKey,
        fetch: fetchMock,
      })
      const resource = createRolesResource(runtime)

      const result = await resource.update(
        'ten_kgn_7f3a9b2c',
        'role_kgn_4d2a1f8e',
        {
          name: 'Operations Manager',
        }
      )

      expect(result).toEqual({
        data: null,
        error: expect.objectContaining({ code: 'couriers/invalid-response' }),
      })
      expect(fetchMock).toHaveBeenCalledTimes(1)
    })

    it('fails closed without admin credential before fetch', async () => {
      const fetchMock = vi.fn<typeof fetch>()
      const runtime = buildAdminRuntime({
        baseUrl,
        apiKey,
        internalKey: '',
        fetch: fetchMock,
      })
      const resource = createRolesResource(runtime)

      const result = await resource.update(
        'ten_kgn_7f3a9b2c',
        'role_kgn_4d2a1f8e',
        {
          name: 'Operations Manager',
        }
      )

      expect(result).toEqual({
        data: null,
        error: expect.objectContaining({
          code: 'couriers/admin-not-configured',
        }),
      })
      expect(fetchMock).not.toHaveBeenCalled()
    })
  })

  describe('delete', () => {
    it('deletes a role and returns a tombstone', async () => {
      const tenantId = 'ten/kgn 001'
      const roleId = 'role/kgn 002'
      const tombstone = {
        object: 'role' as const,
        id: roleId,
        deleted: true as const,
      }
      const fetchMock = vi
        .fn<typeof fetch>()
        .mockResolvedValue(Response.json({ data: tombstone, error: null }))
      const runtime = buildAdminRuntime({
        baseUrl,
        apiKey,
        internalKey,
        fetch: fetchMock,
      })
      const resource = createRolesResource(runtime)

      const result = await resource.delete(tenantId, roleId)

      expect(result).toEqual({ data: tombstone, error: null })
      expect(fetchMock).toHaveBeenCalledTimes(1)
      expect(fetchMock).toHaveBeenCalledWith(
        `https://couriers.example.test/v1/tenants/${encodeURIComponent(tenantId)}/roles/${encodeURIComponent(roleId)}`,
        expect.objectContaining({ method: 'DELETE' })
      )
    })

    it('rejects malformed response bodies', async () => {
      const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
        Response.json({
          data: { object: 'role', id: 'role_kgn_4d2a1f8e' },
          error: null,
        })
      )
      const runtime = buildAdminRuntime({
        baseUrl,
        apiKey,
        internalKey,
        fetch: fetchMock,
      })
      const resource = createRolesResource(runtime)

      const result = await resource.delete(
        'ten_kgn_7f3a9b2c',
        'role_kgn_4d2a1f8e'
      )

      expect(result).toEqual({
        data: null,
        error: expect.objectContaining({ code: 'couriers/invalid-response' }),
      })
      expect(fetchMock).toHaveBeenCalledTimes(1)
    })

    it('fails closed without admin credential before fetch', async () => {
      const fetchMock = vi.fn<typeof fetch>()
      const runtime = buildAdminRuntime({
        baseUrl,
        apiKey,
        internalKey: '',
        fetch: fetchMock,
      })
      const resource = createRolesResource(runtime)

      const result = await resource.delete(
        'ten_kgn_7f3a9b2c',
        'role_kgn_4d2a1f8e'
      )

      expect(result).toEqual({
        data: null,
        error: expect.objectContaining({
          code: 'couriers/admin-not-configured',
        }),
      })
      expect(fetchMock).not.toHaveBeenCalled()
    })
  })
})
