import { describe, expect, it, vi } from 'vitest'

import { buildAdminRuntime } from '../runtime'
import { createSettingsResource } from './settings'

const baseUrl = 'https://couriers.example.test'
const apiKey = '876_app_secret_couriers'
const internalKey = 'couriers_internal_key'

function createModuleFixture(overrides: Record<string, unknown> = {}) {
  return {
    object: 'organization_module' as const,
    module: 'deliveries' as const,
    label: 'Deliveries',
    optional: true,
    is_enabled: true,
    ...overrides,
  }
}

function createModuleListFixture(tenantId = 'ten_kgn_7f3a9b2c') {
  const modules = [
    createModuleFixture({
      module: 'general',
      label: 'General',
      optional: false,
      is_enabled: true,
    }),
    createModuleFixture({
      module: 'deliveries',
      label: 'Deliveries',
      optional: true,
      is_enabled: true,
    }),
    createModuleFixture({
      module: 'invoices',
      label: 'Invoices',
      optional: true,
      is_enabled: false,
    }),
  ]
  return {
    object: 'list' as const,
    data: modules,
    has_more: false,
    total_count: 3,
    url: `/v1/tenants/${tenantId}/modules`,
  }
}

const preferencesFixture = {
  object: 'module_preferences' as const,
  module: 'packages' as const,
  preferences: {
    volumetric_divisor: 6000,
    chargeable_weight_rule: 'greater_of',
  },
  updated_at: 1_785_240_000,
}

describe('admin settings resource', () => {
  describe('list', () => {
    it('lists module states for a Kingston tenant', async () => {
      const tenantId = 'ten/kgn 001'
      const fixture = createModuleListFixture(tenantId)
      const fetchMock = vi
        .fn<typeof fetch>()
        .mockResolvedValue(Response.json({ data: fixture, error: null }))
      const runtime = buildAdminRuntime({
        baseUrl,
        apiKey,
        internalKey,
        fetch: fetchMock,
      })
      const resource = createSettingsResource(runtime)

      const result = await resource.list(tenantId)

      expect(result).toEqual({ data: fixture, error: null })
      expect(fetchMock).toHaveBeenCalledTimes(1)
      expect(fetchMock).toHaveBeenCalledWith(
        `https://couriers.example.test/v1/tenants/${encodeURIComponent(tenantId)}/modules`,
        expect.objectContaining({ method: 'GET' })
      )
    })

    it('rejects malformed response bodies', async () => {
      const fetchMock = vi
        .fn<typeof fetch>()
        .mockResolvedValue(
          Response.json({ data: { object: 'list', data: [] }, error: null })
        )
      const runtime = buildAdminRuntime({
        baseUrl,
        apiKey,
        internalKey,
        fetch: fetchMock,
      })
      const resource = createSettingsResource(runtime)

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
      const resource = createSettingsResource(runtime)

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

  describe('update', () => {
    it('toggles the deliveries module for a Kingston tenant', async () => {
      const tenantId = 'ten/kgn 001'
      const moduleKey = 'deliveries'
      const body = { is_enabled: false }
      const fixture = createModuleFixture({
        module: moduleKey,
        label: 'Deliveries',
        optional: true,
        is_enabled: body.is_enabled,
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
      const resource = createSettingsResource(runtime)

      const result = await resource.update(tenantId, moduleKey, body)

      expect(result).toEqual({ data: fixture, error: null })
      expect(fetchMock).toHaveBeenCalledTimes(1)
      expect(fetchMock).toHaveBeenCalledWith(
        `https://couriers.example.test/v1/tenants/${encodeURIComponent(tenantId)}/modules/${encodeURIComponent(moduleKey)}`,
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify(body),
        })
      )
    })

    it('enables the invoices module', async () => {
      const tenantId = 'ten_kgn_7f3a9b2c'
      const moduleKey = 'invoices'
      const body = { is_enabled: true }
      const fixture = createModuleFixture({
        module: moduleKey,
        label: 'Invoices',
        optional: true,
        is_enabled: true,
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
      const resource = createSettingsResource(runtime)

      const result = await resource.update(tenantId, moduleKey, body)

      expect(result).toEqual({ data: fixture, error: null })
      expect(fetchMock).toHaveBeenCalledTimes(1)
      expect(fetchMock).toHaveBeenCalledWith(
        `https://couriers.example.test/v1/tenants/${encodeURIComponent(tenantId)}/modules/${encodeURIComponent(moduleKey)}`,
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify(body),
        })
      )
    })

    it('rejects malformed response bodies', async () => {
      const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
        Response.json({
          data: { object: 'organization_module' },
          error: null,
        })
      )
      const runtime = buildAdminRuntime({
        baseUrl,
        apiKey,
        internalKey,
        fetch: fetchMock,
      })
      const resource = createSettingsResource(runtime)

      const result = await resource.update('ten_kgn_7f3a9b2c', 'deliveries', {
        is_enabled: false,
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
      const resource = createSettingsResource(runtime)

      const result = await resource.update('ten_kgn_7f3a9b2c', 'deliveries', {
        is_enabled: true,
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

  describe('preferences', () => {
    it('retrieves module preferences with encoded path values', async () => {
      const fetchMock = vi
        .fn<typeof fetch>()
        .mockResolvedValue(
          Response.json({ data: preferencesFixture, error: null })
        )
      const resource = createSettingsResource(
        buildAdminRuntime({ baseUrl, apiKey, internalKey, fetch: fetchMock })
      )

      const result = await resource.preferences.retrieve(
        'ten/kgn 001',
        'packages'
      )

      expect(result).toEqual({ data: preferencesFixture, error: null })
      expect(fetchMock).toHaveBeenCalledWith(
        'https://couriers.example.test/v1/tenants/ten%2Fkgn%20001/modules/packages/preferences',
        expect.objectContaining({ method: 'GET' })
      )
    })

    it('updates module preferences with the exact body', async () => {
      const fetchMock = vi
        .fn<typeof fetch>()
        .mockResolvedValue(
          Response.json({ data: preferencesFixture, error: null })
        )
      const resource = createSettingsResource(
        buildAdminRuntime({ baseUrl, apiKey, internalKey, fetch: fetchMock })
      )
      const body = { volumetric_divisor: 6000 }

      const result = await resource.preferences.update(
        'ten_kgn_7f3a9b2c',
        'packages',
        body
      )

      expect(result).toEqual({ data: preferencesFixture, error: null })
      expect(fetchMock).toHaveBeenCalledWith(
        'https://couriers.example.test/v1/tenants/ten_kgn_7f3a9b2c/modules/packages/preferences',
        expect.objectContaining({ method: 'PATCH', body: JSON.stringify(body) })
      )
    })
  })
})
