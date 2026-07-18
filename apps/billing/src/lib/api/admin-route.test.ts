import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import { requireInternalAdmin } from '@/lib/api/admin-route'

const { retrieveBySlugMock } = vi.hoisted(() => ({
  retrieveBySlugMock: vi.fn(),
}))

vi.mock('@/lib/service', () => ({
  service: { tenants: { retrieveBySlug: retrieveBySlugMock } },
}))

function createTenant(overrides = {}) {
  return {
    id: 'blten_1',
    slug: 'efesto-billing',
    name: 'Efesto Technologies, Inc',
    status: 'ACTIVE' as const,
    organizationId: 'org_1',
    defaultCurrency: 'JMD',
    createdAt: 1752000000,
    updatedAt: 1752000000,
    ...overrides,
  }
}

describe('requireInternalAdmin', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('rejects every request when no internal key is configured', async () => {
    // No BILLING_INTERNAL_KEY env var set
    const request = new Request('http://localhost/api/admin/products/ensure', {
      headers: { 'x-internal-key': 'some-key' },
    })

    const access = await requireInternalAdmin(request)

    expect(access.tenant).toBeNull()
    expect(access.response).not.toBeNull()
    expect(access.response!.status).toBe(503)
    const body = await access.response!.json()
    expect(body.data).toBeNull()
    expect(body.error.message).toBe('Internal admin access is disabled.')
    expect(retrieveBySlugMock).not.toHaveBeenCalled()
  })

  it('rejects when x-internal-key header is missing', async () => {
    vi.stubEnv('BILLING_INTERNAL_KEY', 'secret-key-1234')

    const request = new Request('http://localhost/api/admin/products/ensure')

    const access = await requireInternalAdmin(request)

    expect(access.tenant).toBeNull()
    expect(access.response).not.toBeNull()
    expect(access.response!.status).toBe(401)
    const body = await access.response!.json()
    expect(body.data).toBeNull()
    expect(body.error.message).toBe('Unauthorized.')
    expect(retrieveBySlugMock).not.toHaveBeenCalled()
  })

  it('rejects when x-internal-key header has wrong value', async () => {
    vi.stubEnv('BILLING_INTERNAL_KEY', 'secret-key-1234')

    const request = new Request('http://localhost/api/admin/products/ensure', {
      headers: { 'x-internal-key': 'wrong-key' },
    })

    const access = await requireInternalAdmin(request)

    expect(access.tenant).toBeNull()
    expect(access.response).not.toBeNull()
    expect(access.response!.status).toBe(401)
    const body = await access.response!.json()
    expect(body.data).toBeNull()
    expect(body.error.message).toBe('Unauthorized.')
    expect(retrieveBySlugMock).not.toHaveBeenCalled()
  })

  it('rejects when BILLING_PLATFORM_TENANT_SLUG is not configured', async () => {
    vi.stubEnv('BILLING_INTERNAL_KEY', 'secret-key-1234')
    // BILLING_PLATFORM_TENANT_SLUG is intentionally not set

    const request = new Request('http://localhost/api/admin/products/ensure', {
      headers: { 'x-internal-key': 'secret-key-1234' },
    })

    const access = await requireInternalAdmin(request)

    expect(access.tenant).toBeNull()
    expect(access.response).not.toBeNull()
    expect(access.response!.status).toBe(503)
    const body = await access.response!.json()
    expect(body.data).toBeNull()
    expect(body.error.message).toBe(
      'The Billing platform tenant is not configured.'
    )
    expect(retrieveBySlugMock).not.toHaveBeenCalled()
  })

  it('returns 503 when retrieveBySlug resolves null (tenant not found)', async () => {
    vi.stubEnv('BILLING_INTERNAL_KEY', 'secret-key-1234')
    vi.stubEnv('BILLING_PLATFORM_TENANT_SLUG', 'efesto-billing')
    retrieveBySlugMock.mockResolvedValue(null)

    const request = new Request('http://localhost/api/admin/products/ensure', {
      headers: { 'x-internal-key': 'secret-key-1234' },
    })

    const access = await requireInternalAdmin(request)

    expect(access.tenant).toBeNull()
    expect(access.response).not.toBeNull()
    expect(access.response!.status).toBe(503)
    const body = await access.response!.json()
    expect(body.data).toBeNull()
    expect(body.error.message).toBe(
      'The Billing platform tenant is unavailable.'
    )
    expect(retrieveBySlugMock).toHaveBeenCalledTimes(1)
    expect(retrieveBySlugMock).toHaveBeenCalledWith('efesto-billing')
  })

  it('returns 503 when tenant has non-ACTIVE status (e.g. SUSPENDED)', async () => {
    vi.stubEnv('BILLING_INTERNAL_KEY', 'secret-key-1234')
    vi.stubEnv('BILLING_PLATFORM_TENANT_SLUG', 'efesto-billing')
    retrieveBySlugMock.mockResolvedValue(createTenant({ status: 'SUSPENDED' }))

    const request = new Request('http://localhost/api/admin/products/ensure', {
      headers: { 'x-internal-key': 'secret-key-1234' },
    })

    const access = await requireInternalAdmin(request)

    expect(access.tenant).toBeNull()
    expect(access.response).not.toBeNull()
    expect(access.response!.status).toBe(503)
    const body = await access.response!.json()
    expect(body.data).toBeNull()
    expect(body.error.message).toBe(
      'The Billing platform tenant is unavailable.'
    )
  })

  it('returns the tenant with null response when credentials and tenant are valid', async () => {
    vi.stubEnv('BILLING_INTERNAL_KEY', 'secret-key-1234')
    vi.stubEnv('BILLING_PLATFORM_TENANT_SLUG', 'efesto-billing')
    const tenant = createTenant({ id: 'blten_1' })
    retrieveBySlugMock.mockResolvedValue(tenant)

    const request = new Request('http://localhost/api/admin/products/ensure', {
      headers: { 'x-internal-key': 'secret-key-1234' },
    })

    const access = await requireInternalAdmin(request)

    expect(access.response).toBeNull()
    expect(access.tenant).not.toBeNull()
    expect(access.tenant!.id).toBe('blten_1')
    expect(access.tenant).toEqual(tenant)
  })

  it('rejects prefix-based key matches (shorter key)', async () => {
    vi.stubEnv('BILLING_INTERNAL_KEY', 'secret-key-1234')

    const request = new Request('http://localhost/api/admin/products/ensure', {
      headers: { 'x-internal-key': 'secret-key-12' },
    })

    const access = await requireInternalAdmin(request)

    expect(access.tenant).toBeNull()
    expect(access.response).not.toBeNull()
    expect(access.response!.status).toBe(401)
    const body = await access.response!.json()
    expect(body.data).toBeNull()
    expect(body.error.message).toBe('Unauthorized.')
    expect(retrieveBySlugMock).not.toHaveBeenCalled()
  })

  it('rejects prefix-based key matches (longer key with extra suffix)', async () => {
    vi.stubEnv('BILLING_INTERNAL_KEY', 'secret-key-1234')

    const request = new Request('http://localhost/api/admin/products/ensure', {
      headers: { 'x-internal-key': 'secret-key-1234extra' },
    })

    const access = await requireInternalAdmin(request)

    expect(access.tenant).toBeNull()
    expect(access.response).not.toBeNull()
    expect(access.response!.status).toBe(401)
    const body = await access.response!.json()
    expect(body.data).toBeNull()
    expect(body.error.message).toBe('Unauthorized.')
    expect(retrieveBySlugMock).not.toHaveBeenCalled()
  })
})
