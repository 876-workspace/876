import request from 'supertest'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createApp } from '@/app'
import { resetSettingsForTest } from '@/config'

const mocks = vi.hoisted(() => ({
  tenantByOrganizationId: vi.fn(),
  activeMember: vi.fn(),
  activeConnection: vi.fn(),
  appForApiKey: vi.fn(),
  introspect: vi.fn(),
  userBelongsToOrganization: vi.fn(),
  listTenantsByOrganizationIds: vi.fn(),
  applyTenantLifecycle: vi.fn(),
}))

vi.mock('@/modules/tenants', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/modules/tenants')>()),
  tenantAuthorizationByOrganizationId: mocks.tenantByOrganizationId,
}))
vi.mock('@/modules/access', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/modules/access')>()),
  activeMemberAuthorization: mocks.activeMember,
}))
vi.mock('@/modules/finance-connections', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/modules/finance-connections')>()),
  activeConnectionAuthorization: mocks.activeConnection,
}))
vi.mock('@/modules/tenants/tenants.service', async (importOriginal) => ({
  ...(await importOriginal<
    typeof import('@/modules/tenants/tenants.service')
  >()),
  listTenantsByOrganizationIds: mocks.listTenantsByOrganizationIds,
  applyTenantLifecycle: mocks.applyTenantLifecycle,
}))
vi.mock('@/providers/identity', () => ({
  HttpIdentityGateway: class {
    appForApiKey = mocks.appForApiKey
    introspect = mocks.introspect
    userBelongsToOrganization = mocks.userBelongsToOrganization
  },
}))

describe('Internal tenants routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.BILLING_INTERNAL_KEY = 'internal-secret'
    process.env.BILLING_SCHEDULER_KEY = 'scheduler-secret'
    resetSettingsForTest(process.env)
    mocks.tenantByOrganizationId.mockResolvedValue({
      id: 'btenant_1',
      active: true,
    })
    mocks.activeMember.mockResolvedValue({
      kind: 'internal',
      permissions: [],
    } as never)
    mocks.activeConnection.mockResolvedValue(null)
    mocks.listTenantsByOrganizationIds.mockResolvedValue([])
    mocks.applyTenantLifecycle.mockResolvedValue({
      object: 'billing_tenant_lifecycle',
      organizationId: 'org_1',
      action: 'archive',
      tenantId: 'ten_1',
      status: 'SUSPENDED',
      deletedAt: 1234567890,
    })
  })

  describe('POST /internal/projections/tenants', () => {
    it('returns tenants for allowed internal key', async () => {
      const tenants = [
        {
          id: 'ten_1',
          organizationId: 'org_1',
          slug: 'test-org',
          name: 'Test',
          status: 'ACTIVE',
          defaultCurrency: 'JMD',
          defaultLanguage: 'en',
          createdAt: 1,
          updatedAt: 1,
        },
      ]
      mocks.listTenantsByOrganizationIds.mockResolvedValue(
        tenants as unknown as never
      )
      const res = await request(createApp())
        .post('/internal/projections/tenants')
        .set('x-internal-key', 'internal-secret')
        .send({ organizationIds: ['org_1'] })
      expect(res.status).toBe(200)
      expect(res.body.data).toEqual(tenants)
      expect(mocks.listTenantsByOrganizationIds).toHaveBeenCalledWith(['org_1'])
    })

    it('rejects without internal key', async () => {
      const res = await request(createApp())
        .post('/internal/projections/tenants')
        .send({ organizationIds: ['org_1'] })
      expect(res.status).toBe(401)
    })

    it('rejects with wrong internal key', async () => {
      const res = await request(createApp())
        .post('/internal/projections/tenants')
        .set('x-internal-key', 'wrong-key')
        .send({ organizationIds: ['org_1'] })
      expect(res.status).toBe(401)
    })

    it('validates empty organizationIds', async () => {
      const res = await request(createApp())
        .post('/internal/projections/tenants')
        .set('x-internal-key', 'internal-secret')
        .send({ organizationIds: [] })
      expect(res.status).toBe(200)
    })

    it('validates organizationIds max 100', async () => {
      const ids = Array.from({ length: 101 }, (_, i) => `org_${i}`)
      const res = await request(createApp())
        .post('/internal/projections/tenants')
        .set('x-internal-key', 'internal-secret')
        .send({ organizationIds: ids })
      expect(res.status).toBe(422)
    })

    it('rejects missing organizationIds', async () => {
      const res = await request(createApp())
        .post('/internal/projections/tenants')
        .set('x-internal-key', 'internal-secret')
        .send({})
      expect(res.status).toBe(422)
    })

    it('rejects non-string organizationIds', async () => {
      const res = await request(createApp())
        .post('/internal/projections/tenants')
        .set('x-internal-key', 'internal-secret')
        .send({ organizationIds: [123] })
      expect(res.status).toBe(422)
    })
  })

  describe('POST /internal/tenants/lifecycle', () => {
    it('archives a workspace with internal key', async () => {
      const res = await request(createApp())
        .post('/internal/tenants/lifecycle')
        .set('x-internal-key', 'internal-secret')
        .send({
          organizationId: 'org_1',
          action: 'archive',
          deletedBy: 'user_1',
          reason: 'deleted',
        })
      expect(res.status).toBe(200)
      expect(res.body.data).toEqual({
        object: 'billing_tenant_lifecycle',
        organizationId: 'org_1',
        action: 'archive',
        tenantId: 'ten_1',
        status: 'SUSPENDED',
        deletedAt: 1234567890,
      })
      expect(mocks.applyTenantLifecycle).toHaveBeenCalledWith('org_1', {
        organizationId: 'org_1',
        action: 'archive',
        deletedBy: 'user_1',
        reason: 'deleted',
      })
    })

    it('restores a workspace', async () => {
      mocks.applyTenantLifecycle.mockResolvedValue({
        object: 'billing_tenant_lifecycle',
        organizationId: 'org_1',
        action: 'restore',
        tenantId: 'ten_1',
        status: 'ACTIVE',
        deletedAt: null,
      })
      const res = await request(createApp())
        .post('/internal/tenants/lifecycle')
        .set('x-internal-key', 'internal-secret')
        .send({ organizationId: 'org_1', action: 'restore' })
      expect(res.status).toBe(200)
      expect(res.body.data.action).toBe('restore')
      expect(res.body.data.status).toBe('ACTIVE')
    })

    it('handles archive without optional fields', async () => {
      const res = await request(createApp())
        .post('/internal/tenants/lifecycle')
        .set('x-internal-key', 'internal-secret')
        .send({ organizationId: 'org_1', action: 'archive' })
      expect(res.status).toBe(200)
    })

    it('handles restore without optional fields', async () => {
      const res = await request(createApp())
        .post('/internal/tenants/lifecycle')
        .set('x-internal-key', 'internal-secret')
        .send({ organizationId: 'org_1', action: 'restore' })
      expect(res.status).toBe(200)
    })

    it('rejects without internal key', async () => {
      const res = await request(createApp())
        .post('/internal/tenants/lifecycle')
        .send({ organizationId: 'org_1', action: 'archive' })
      expect(res.status).toBe(401)
    })

    it('rejects with wrong internal key', async () => {
      const res = await request(createApp())
        .post('/internal/tenants/lifecycle')
        .set('x-internal-key', 'bad')
        .send({ organizationId: 'org_1', action: 'archive' })
      expect(res.status).toBe(401)
    })

    it('validates missing organizationId', async () => {
      const res = await request(createApp())
        .post('/internal/tenants/lifecycle')
        .set('x-internal-key', 'internal-secret')
        .send({ action: 'archive' })
      expect(res.status).toBe(422)
    })

    it('validates invalid action', async () => {
      const res = await request(createApp())
        .post('/internal/tenants/lifecycle')
        .set('x-internal-key', 'internal-secret')
        .send({ organizationId: 'org_1', action: 'invalid' })
      expect(res.status).toBe(422)
    })

    it('validates empty organizationId', async () => {
      const res = await request(createApp())
        .post('/internal/tenants/lifecycle')
        .set('x-internal-key', 'internal-secret')
        .send({ organizationId: '', action: 'archive' })
      expect(res.status).toBe(422)
    })

    it('returns null tenantId when org never had workspace', async () => {
      mocks.applyTenantLifecycle.mockResolvedValue({
        object: 'billing_tenant_lifecycle',
        organizationId: 'org_none',
        action: 'archive',
        tenantId: null,
        status: null,
        deletedAt: null,
      })
      const res = await request(createApp())
        .post('/internal/tenants/lifecycle')
        .set('x-internal-key', 'internal-secret')
        .send({ organizationId: 'org_none', action: 'archive' })
      expect(res.status).toBe(200)
      expect(res.body.data.tenantId ?? null).toBeNull()
      expect(res.body.data.status ?? null).toBeNull()
    })

    it('accepts null deletedBy and reason', async () => {
      const res = await request(createApp())
        .post('/internal/tenants/lifecycle')
        .set('x-internal-key', 'internal-secret')
        .send({
          organizationId: 'org_1',
          action: 'archive',
          deletedBy: null,
          reason: null,
        })
      expect(res.status).toBe(200)
    })

    it('rejects deletedBy over 191 chars', async () => {
      const res = await request(createApp())
        .post('/internal/tenants/lifecycle')
        .set('x-internal-key', 'internal-secret')
        .send({
          organizationId: 'org_1',
          action: 'archive',
          deletedBy: 'u'.repeat(192),
        })
      expect(res.status).toBe(422)
    })

    it('rejects reason over 500 chars', async () => {
      const res = await request(createApp())
        .post('/internal/tenants/lifecycle')
        .set('x-internal-key', 'internal-secret')
        .send({
          organizationId: 'org_1',
          action: 'archive',
          reason: 'a'.repeat(501),
        })
      expect(res.status).toBe(422)
    })

    it('trims reason', async () => {
      const res = await request(createApp())
        .post('/internal/tenants/lifecycle')
        .set('x-internal-key', 'internal-secret')
        .send({
          organizationId: 'org_1',
          action: 'archive',
          reason: '  hello  ',
        })
      expect(res.status).toBe(200)
      expect(mocks.applyTenantLifecycle).toHaveBeenCalledWith(
        'org_1',
        expect.objectContaining({ reason: 'hello' })
      )
    })

    it('rejects unknown fields (strict)', async () => {
      const res = await request(createApp())
        .post('/internal/tenants/lifecycle')
        .set('x-internal-key', 'internal-secret')
        .send({ organizationId: 'org_1', action: 'archive', unknown: 'field' })
      expect(res.status).toBe(422)
    })
  })
})
