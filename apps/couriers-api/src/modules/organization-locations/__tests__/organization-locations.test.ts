import request from 'supertest'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const APP_KEY = '876_app_secret_test_key_for_couriers_api'
const ADMIN_HEADERS = {
  'X-876-API-Key': APP_KEY,
  'x-internal-key': 'test-internal-key',
}

function address() {
  return {
    line1: '1 Harbour Street',
    line2: null,
    city: 'Kingston',
    regionCode: 'KSA',
    countryCode: 'JM',
    postalCode: null,
  }
}

function branchRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'br_kingston',
    tenantId: 'ten_1',
    orgLocationId: null,
    name: 'Kingston Branch',
    phone: '+18765550123',
    isActive: true,
    isDefault: true,
    address: address(),
    ...overrides,
  }
}

function warehouseRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'wh_miami',
    tenantId: 'ten_1',
    orgLocationId: null,
    name: 'Miami Warehouse',
    isActive: true,
    isPrimary: true,
    address: address(),
    ...overrides,
  }
}

const { tenant, branch, warehouse, apiKey, platform } = vi.hoisted(() => ({
  tenant: { findUnique: vi.fn() },
  branch: { findFirst: vi.fn(), findMany: vi.fn(), updateMany: vi.fn() },
  warehouse: { findFirst: vi.fn(), findMany: vi.fn(), updateMany: vi.fn() },
  apiKey: { findUnique: vi.fn(), update: vi.fn() },
  platform: {
    resolvePlatformRegionId: vi.fn(),
    createOrganizationLocation: vi.fn(),
    listOrganizationLocations: vi.fn(),
    updateOrganizationLocation: vi.fn(),
  },
}))

vi.mock('@/db/client', () => ({
  prisma: { tenant, branch, warehouse, apiKey },
  disconnectDb: vi.fn(),
  pingDb: vi.fn(),
}))

vi.mock('@/providers/platform/locations', () => platform)

const { createApp } = await import('@/app')
const { resetSettingsForTest } = await import('@/config')
const testEnv: NodeJS.ProcessEnv = {
  ENVIRONMENT: 'test',
  LOG_LEVEL: 'silent',
  PORT: '4001',
  DATABASE_URL: 'prisma://127.0.0.1:1/?api_key=test',
  DIRECT_DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
  API_876_KEY: APP_KEY,
  API_INTERNAL_KEY: 'test-internal-key',
  SENTRY_DSN: '',
}

beforeEach(() => {
  vi.clearAllMocks()
  tenant.findUnique.mockResolvedValue({ id: 'ten_1', orgId: 'org_1' })
  branch.findMany.mockResolvedValue([])
  branch.findFirst.mockResolvedValue(branchRow())
  branch.updateMany.mockResolvedValue({ count: 1 })
  warehouse.findMany.mockResolvedValue([])
  warehouse.findFirst.mockResolvedValue(warehouseRow())
  warehouse.updateMany.mockResolvedValue({ count: 1 })
  apiKey.findUnique.mockResolvedValue({
    id: 'key_1',
    appId: 'app_couriers',
    revoked: false,
    expiresAt: null,
  })
  apiKey.update.mockResolvedValue({})
  platform.resolvePlatformRegionId.mockResolvedValue('reg_ksa')
  platform.createOrganizationLocation.mockResolvedValue({
    data: { id: 'loc_1' },
    error: null,
  })
  platform.listOrganizationLocations.mockResolvedValue({
    data: { object: 'list', data: [], has_more: false, total_count: null },
    error: null,
  })
  platform.updateOrganizationLocation.mockResolvedValue({
    data: { id: 'loc_1' },
    error: null,
  })
  resetSettingsForTest(testEnv)
})

afterEach(() => {
  resetSettingsForTest(testEnv)
})

describe('organization locations', () => {
  it('reconciles a bounded branch-first batch and links each successful mirror', async () => {
    branch.findMany.mockResolvedValue([branchRow()])
    warehouse.findMany.mockResolvedValue([warehouseRow()])
    platform.createOrganizationLocation
      .mockResolvedValueOnce({ data: { id: 'loc_branch' }, error: null })
      .mockResolvedValueOnce({ data: { id: 'loc_warehouse' }, error: null })

    const response = await request(createApp())
      .post('/v1/tenants/ten_1/organization-locations/reconcile')
      .set(ADMIN_HEADERS)

    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      data: {
        object: 'organization_location_reconciliation',
        tenant_id: 'ten_1',
        attempted: 2,
        succeeded: 2,
        failed: 0,
      },
      error: null,
    })
    expect(branch.findMany).toHaveBeenCalledWith({
      where: { tenantId: 'ten_1', orgLocationId: null },
      take: 25,
      include: { address: true },
    })
    expect(warehouse.findMany).toHaveBeenCalledWith({
      where: { tenantId: 'ten_1', orgLocationId: null },
      take: 24,
      include: { address: true },
    })
    expect(platform.createOrganizationLocation).toHaveBeenNthCalledWith(
      1,
      'org_1',
      expect.objectContaining({
        code: 'br_kingston',
        type: 'branch',
        regionId: 'reg_ksa',
      })
    )
    expect(platform.createOrganizationLocation).toHaveBeenNthCalledWith(
      2,
      'org_1',
      expect.objectContaining({ code: 'wh_miami', type: 'warehouse' })
    )
    expect(branch.updateMany).toHaveBeenCalledWith({
      where: { tenantId: 'ten_1', id: 'br_kingston' },
      data: { orgLocationId: 'loc_branch' },
    })
    expect(warehouse.updateMany).toHaveBeenCalledWith({
      where: { tenantId: 'ten_1', id: 'wh_miami' },
      data: { orgLocationId: 'loc_warehouse' },
    })
  })

  it('adopts and updates a duplicate-code location before linking it', async () => {
    branch.findMany.mockResolvedValue([branchRow({ name: 'Kingston HQ' })])
    platform.createOrganizationLocation.mockResolvedValue({
      data: null,
      error: { code: 'location/duplicate-code', message: 'Duplicate.' },
    })
    platform.listOrganizationLocations.mockResolvedValue({
      data: {
        object: 'list',
        data: [{ id: 'loc_adopted', code: 'br_kingston' }],
        has_more: false,
        total_count: null,
      },
      error: null,
    })

    const response = await request(createApp())
      .post('/v1/tenants/ten_1/organization-locations/reconcile')
      .set(ADMIN_HEADERS)

    expect(response.status).toBe(200)
    expect(platform.updateOrganizationLocation).toHaveBeenCalledWith(
      'org_1',
      'loc_adopted',
      expect.objectContaining({ code: 'br_kingston', name: 'Kingston HQ' })
    )
    expect(branch.updateMany).toHaveBeenCalledWith({
      where: { tenantId: 'ten_1', id: 'br_kingston' },
      data: { orgLocationId: 'loc_adopted' },
    })
  })

  it('records an upstream failure in the result without exposing it to the page', async () => {
    branch.findMany.mockResolvedValue([branchRow()])
    platform.createOrganizationLocation.mockResolvedValue({
      data: null,
      error: { code: 'platform/unavailable', message: 'Upstream failed.' },
    })

    const response = await request(createApp())
      .post('/v1/tenants/ten_1/organization-locations/reconcile')
      .set(ADMIN_HEADERS)

    expect(response.status).toBe(200)
    expect(response.body.data).toMatchObject({
      attempted: 1,
      succeeded: 0,
      failed: 1,
    })
    expect(branch.updateMany).not.toHaveBeenCalled()
  })

  it('updates an existing linked site through the individual sync route', async () => {
    branch.findFirst.mockResolvedValue(
      branchRow({ orgLocationId: 'loc_existing' })
    )

    const response = await request(createApp())
      .post('/v1/tenants/ten_1/organization-locations/sync')
      .set(ADMIN_HEADERS)
      .send({ kind: 'branch', site_id: 'br_kingston' })

    expect(response.status).toBe(200)
    expect(response.body.data).toMatchObject({
      attempted: 1,
      succeeded: 1,
      failed: 0,
    })
    expect(platform.updateOrganizationLocation).toHaveBeenCalledWith(
      'org_1',
      'loc_existing',
      expect.objectContaining({ code: 'br_kingston' })
    )
    expect(branch.updateMany).not.toHaveBeenCalled()
  })

  it('returns a tenant-scoped not-found error before querying sites', async () => {
    tenant.findUnique.mockResolvedValue(null)

    const response = await request(createApp())
      .post('/v1/tenants/ten_missing/organization-locations/reconcile')
      .set(ADMIN_HEADERS)

    expect(response.status).toBe(404)
    expect(response.body).toEqual({
      data: null,
      error: { code: 'tenant/not-found', message: 'Not found.' },
    })
    expect(branch.findMany).not.toHaveBeenCalled()
  })
})
