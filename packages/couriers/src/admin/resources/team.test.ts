import { describe, expect, it, vi } from 'vitest'

import { buildAdminRuntime } from '../runtime'
import { createTeamResource } from './team'

const baseUrl = 'https://couriers.example.test'
const apiKey = '876_app_secret_couriers'
const internalKey = 'couriers_internal_key'

function createTeamFixture(overrides: Record<string, unknown> = {}) {
  return {
    object: 'team_member' as const,
    id: 'tm_kgn_8e2f1a3b',
    tenant_id: 'ten_kgn_7f3a9b2c',
    user_id: 'usr_kgn_2a9c4d1e',
    role_id: 'role_kgn_4d2a1f8e',
    role_name: 'Dispatch Supervisor',
    role_system_key: null,
    status: 'active' as const,
    created_at: 1710000000,
    updated_at: 1710000000,
    ...overrides,
  }
}

function createTeamListFixture(tenantId = 'ten_kgn_7f3a9b2c') {
  const member = createTeamFixture({ tenant_id: tenantId })
  return {
    object: 'list' as const,
    data: [member],
    has_more: false,
    total_count: 1,
    url: `/v1/tenants/${tenantId}/team`,
  }
}

describe('admin team resource', () => {
  describe('list', () => {
    it('lists team members for a Kingston tenant', async () => {
      const tenantId = 'ten/kgn 001'
      const fixture = createTeamListFixture(tenantId)
      const fetchMock = vi
        .fn<typeof fetch>()
        .mockResolvedValue(Response.json({ data: fixture, error: null }))
      const runtime = buildAdminRuntime({
        baseUrl,
        apiKey,
        internalKey,
        fetch: fetchMock,
      })
      const resource = createTeamResource(runtime)

      const result = await resource.list(tenantId)

      expect(result).toEqual({ data: fixture, error: null })
      expect(fetchMock).toHaveBeenCalledTimes(1)
      expect(fetchMock).toHaveBeenCalledWith(
        `https://couriers.example.test/v1/tenants/${encodeURIComponent(tenantId)}/team`,
        expect.objectContaining({ method: 'GET' })
      )
    })

    it('rejects malformed response bodies', async () => {
      const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
        Response.json({
          data: { object: 'team_member', id: 'tm_1' },
          error: null,
        })
      )
      const runtime = buildAdminRuntime({
        baseUrl,
        apiKey,
        internalKey,
        fetch: fetchMock,
      })
      const resource = createTeamResource(runtime)

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
      const resource = createTeamResource(runtime)

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
    it('adds a Delivery Driver to the Kingston team', async () => {
      const tenantId = 'ten/kgn 001'
      const body = {
        user_id: 'usr_kgn_5b8e3f2a',
        role_id: 'role_kgn_4d2a1f8e',
      }
      const fixture = createTeamFixture({
        id: 'tm_kgn_9c1d2e3f',
        tenant_id: tenantId,
        user_id: body.user_id,
        role_id: body.role_id,
        role_name: 'Delivery Driver',
        status: 'active',
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
      const resource = createTeamResource(runtime)

      const result = await resource.create(tenantId, body)

      expect(result).toEqual({ data: fixture, error: null })
      expect(fetchMock).toHaveBeenCalledTimes(1)
      expect(fetchMock).toHaveBeenCalledWith(
        `https://couriers.example.test/v1/tenants/${encodeURIComponent(tenantId)}/team`,
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
          Response.json({ data: { object: 'team_member' }, error: null })
        )
      const runtime = buildAdminRuntime({
        baseUrl,
        apiKey,
        internalKey,
        fetch: fetchMock,
      })
      const resource = createTeamResource(runtime)

      const result = await resource.create('ten_kgn_7f3a9b2c', {
        user_id: 'usr_kgn_5b8e3f2a',
        role_id: 'role_kgn_4d2a1f8e',
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
      const resource = createTeamResource(runtime)

      const result = await resource.create('ten_kgn_7f3a9b2c', {
        user_id: 'usr_kgn_5b8e3f2a',
        role_id: 'role_kgn_4d2a1f8e',
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
    it('updates a team member to inactive', async () => {
      const tenantId = 'ten/kgn 001'
      const memberId = 'tm/kgn 002'
      const body = { status: 'inactive' as const }
      const fixture = createTeamFixture({
        id: memberId,
        tenant_id: tenantId,
        status: body.status,
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
      const resource = createTeamResource(runtime)

      const result = await resource.update(tenantId, memberId, body)

      expect(result).toEqual({ data: fixture, error: null })
      expect(fetchMock).toHaveBeenCalledTimes(1)
      expect(fetchMock).toHaveBeenCalledWith(
        `https://couriers.example.test/v1/tenants/${encodeURIComponent(tenantId)}/team/${encodeURIComponent(memberId)}`,
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
          Response.json({ data: { id: 'tm_kgn_8e2f1a3b' }, error: null })
        )
      const runtime = buildAdminRuntime({
        baseUrl,
        apiKey,
        internalKey,
        fetch: fetchMock,
      })
      const resource = createTeamResource(runtime)

      const result = await resource.update(
        'ten_kgn_7f3a9b2c',
        'tm_kgn_8e2f1a3b',
        {
          role_id: 'role_kgn_9b1c2d3e',
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
      const resource = createTeamResource(runtime)

      const result = await resource.update(
        'ten_kgn_7f3a9b2c',
        'tm_kgn_8e2f1a3b',
        {
          status: 'inactive',
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
})
