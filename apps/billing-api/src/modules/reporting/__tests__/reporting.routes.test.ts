import request from 'supertest'

import { createApp } from '@/application'
import { resetSettingsForTest } from '@/config'

const mocks = vi.hoisted(() => ({
  tenantByOrganizationId: vi.fn(),
  effectiveMember: vi.fn(),
  activeConnection: vi.fn(),
  appForApiKey: vi.fn(),
  introspect: vi.fn(),
  organizationMembership: vi.fn(),
  bucketSpine: vi.fn(),
  invoiceSalesRows: vi.fn(),
  salesReceiptRows: vi.fn(),
  creditNoteRows: vi.fn(),
  itemSalesRows: vi.fn(),
  itemBucketRows: vi.fn(),
  retrieveReportPreferences: vi.fn(),
  updateReportPreferences: vi.fn(),
}))

vi.mock('@/modules/tenants', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/modules/tenants')>()),
  tenantAuthorizationByOrganizationId: mocks.tenantByOrganizationId,
}))
vi.mock('@/modules/access', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/modules/access')>()),
  effectiveMemberAuthorization: mocks.effectiveMember,
}))
vi.mock('@/modules/finance-connections', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/modules/finance-connections')>()),
  activeConnectionAuthorization: mocks.activeConnection,
}))
vi.mock('@/modules/reporting/reporting.repository', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  bucketSpine: mocks.bucketSpine,
  invoiceSalesRows: mocks.invoiceSalesRows,
  salesReceiptRows: mocks.salesReceiptRows,
  creditNoteRows: mocks.creditNoteRows,
  itemSalesRows: mocks.itemSalesRows,
  itemBucketRows: mocks.itemBucketRows,
}))
vi.mock('@/modules/reporting/report-preferences.repository', () => ({
  retrieveReportPreferences: mocks.retrieveReportPreferences,
  updateReportPreferences: mocks.updateReportPreferences,
}))
vi.mock('@/providers/identity', () => ({
  HttpIdentityGateway: class {
    appForApiKey = mocks.appForApiKey
    introspect = mocks.introspect
    organizationMembership = mocks.organizationMembership
  },
}))

const PREFS = {
  object: 'report_preferences' as const,
  timezone: 'America/Jamaica',
  fiscalYearStartMonth: 1,
}

function tenantCall(builder: request.Test): request.Test {
  return builder
    .set('authorization', 'Bearer access-token')
    .set('x-billing-organization-id', 'org_123')
}

describe('Reporting routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.BILLING_WRITER = 'express'
    resetSettingsForTest(process.env)
    mocks.tenantByOrganizationId.mockResolvedValue({
      id: 'btenant_123',
      active: true,
    })
    mocks.effectiveMember.mockResolvedValue({
      permissions: new Set(['reports:read']),
    })
    mocks.introspect.mockResolvedValue({
      active: true,
      subject: 'user_123',
      appId: null,
      scopes: new Set(),
    })
    mocks.organizationMembership.mockResolvedValue({ role: 'super-admin' })
    mocks.activeConnection.mockResolvedValue({
      scopes: new Set(['billing.invoices.read']),
    })
    mocks.appForApiKey.mockResolvedValue({ id: 'app_123' })
    mocks.retrieveReportPreferences.mockResolvedValue(PREFS)
    mocks.bucketSpine.mockResolvedValue([{ start: 1_000, end: 1_001 }])
    mocks.invoiceSalesRows.mockResolvedValue([])
    mocks.salesReceiptRows.mockResolvedValue([])
    mocks.creditNoteRows.mockResolvedValue([])
    mocks.itemSalesRows.mockResolvedValue([])
    mocks.itemBucketRows.mockResolvedValue([])
  })

  it('serves the tenant sales summary behind reports:read', async () => {
    const response = await tenantCall(
      request(createApp()).get(
        '/api/v1/reports/sales-summary?from=1000&to=1001&groupBy=day'
      )
    )

    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      data: {
        object: 'sales-summary',
        timezone: 'America/Jamaica',
        fiscalYearStartMonth: 1,
        from: 1_000,
        to: 1_001,
        groupBy: 'day',
        currencies: [],
      },
      error: null,
    })
    expect(mocks.invoiceSalesRows).toHaveBeenCalledWith(
      'btenant_123',
      { from: 1_000, to: 1_001 },
      'day',
      'America/Jamaica'
    )
  })

  it('rejects tenant reporting without a credential', async () => {
    const response = await request(createApp())
      .get('/api/v1/reports/sales-summary?from=1000&to=1001')
      .set('x-billing-organization-id', 'org_123')

    expect(response.status).toBe(401)
    expect(response.body.error.code).toBe('auth/missing-credential')
    expect(mocks.invoiceSalesRows).not.toHaveBeenCalled()
  })

  it('rejects tenant reporting without the reports permission', async () => {
    mocks.effectiveMember.mockResolvedValue({
      permissions: new Set(['sales:read']),
    })

    const response = await tenantCall(
      request(createApp()).get(
        '/api/v1/reports/sales-summary?from=1000&to=1001'
      )
    )

    expect(response.status).toBe(403)
    expect(mocks.invoiceSalesRows).not.toHaveBeenCalled()
  })

  it('serves the integration sales summary behind billing.invoices.read', async () => {
    const response = await request(createApp())
      .get(
        '/api/v1/integrations/organizations/org_123/reports/sales-summary?from=1000&to=1001'
      )
      .set('x-876-api-key', '876_app_secret_test')

    expect(response.status).toBe(200)
    expect(response.body.data.object).toBe('sales-summary')
    expect(response.body.error).toBeNull()
    expect(mocks.invoiceSalesRows).toHaveBeenCalledWith(
      'btenant_123',
      { from: 1_000, to: 1_001 },
      'day',
      'America/Jamaica'
    )
  })

  it('rejects integration reporting without the invoices scope', async () => {
    mocks.activeConnection.mockResolvedValue({
      scopes: new Set(['billing.customers.read']),
    })

    const response = await request(createApp())
      .get(
        '/api/v1/integrations/organizations/org_123/reports/sales-summary?from=1000&to=1001'
      )
      .set('x-876-api-key', '876_app_secret_test')

    expect(response.status).toBe(403)
    expect(mocks.invoiceSalesRows).not.toHaveBeenCalled()
  })

  it('returns a 422 envelope without an httpStatus leak for a reversed range', async () => {
    const response = await tenantCall(
      request(createApp()).get(
        '/api/v1/reports/sales-summary?from=2000&to=1000'
      )
    )

    expect(response.status).toBe(422)
    expect(response.body.data).toBeNull()
    expect(response.body.error.code).toBe('validation/invalid-request')
    expect(response.body.error).not.toHaveProperty('httpStatus')
  })

  it('rejects a report preference change from a reports:read-only member', async () => {
    const response = await tenantCall(
      request(createApp())
        .patch('/api/v1/report-preferences')
        .send({ timezone: 'America/New_York' })
    )

    expect(response.status).toBe(403)
    expect(mocks.updateReportPreferences).not.toHaveBeenCalled()
  })

  it('rejects an unknown reporting timezone with a 422 error', async () => {
    mocks.effectiveMember.mockResolvedValue({
      permissions: new Set(['reports:read', 'sales:write']),
    })
    mocks.updateReportPreferences.mockImplementation(async () => {
      const { errors } = await import('@/http/errors')
      throw errors.validation(
        'The reporting timezone must be a valid IANA timezone.'
      )
    })

    const response = await tenantCall(
      request(createApp())
        .patch('/api/v1/report-preferences')
        .send({ timezone: 'Not/AZone' })
    )

    expect(response.status).toBe(422)
    expect(response.body.error.code).toBe('validation/invalid-request')
    expect(response.body.error).not.toHaveProperty('httpStatus')
  })

  it('serves the item sales summary for one item', async () => {
    const response = await tenantCall(
      request(createApp()).get('/api/v1/items/item_1/sales-summary')
    )

    expect(response.status).toBe(200)
    expect(response.body.data).toMatchObject({
      object: 'item-sales-summary',
      itemId: 'item_1',
    })
    expect(response.body.error).toBeNull()
  })
})
