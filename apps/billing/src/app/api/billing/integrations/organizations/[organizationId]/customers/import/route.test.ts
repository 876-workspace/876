import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  requireIntegrationOrganization: vi.fn(),
  importCustomers: vi.fn(),
}))

vi.mock('@/lib/api/integration-route', () => ({
  integrationRoute:
    (handler: (request: Request, context: unknown) => Promise<Response>) =>
    (request: Request, context: unknown) =>
      handler(request, context),
  requireIntegrationOrganization: mocks.requireIntegrationOrganization,
}))
vi.mock('@/lib/service', () => ({
  service: { customers: { import: mocks.importCustomers } },
}))

import { POST } from './route'

const importResult = {
  object: 'customer_import' as const,
  dryRun: false,
  duplicateStrategy: 'skip' as const,
  summary: { created: 1, updated: 0, skipped: 0, failed: 0 },
  results: [
    {
      rowNumber: 2,
      action: 'created' as const,
      customerId: 'cus_new',
      error: null,
    },
  ],
}

function request(body: unknown, headers: Record<string, string> = {}): Request {
  return new Request(
    'http://localhost/api/v1/integrations/organizations/org_123/customers/import',
    {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...headers },
      body: JSON.stringify(body),
    }
  )
}

function context() {
  return { params: Promise.resolve({ organizationId: 'org_123' }) }
}

describe('POST customer import integration route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.requireIntegrationOrganization.mockResolvedValue({
      tenant: { id: 'ten_123' },
      connection: { id: 'afc_123' },
      sourceAppId: 'app_couriers',
      platformAdmin: false,
      response: null,
    })
    mocks.importCustomers.mockResolvedValue({
      data: importResult,
      error: null,
    })
  })

  it('imports customers for a product app and forwards idempotency attribution', async () => {
    const body = {
      duplicateStrategy: 'skip',
      rows: [{ rowNumber: 2, name: 'Island Supplies' }],
    }

    const response = await POST(
      request(body, { 'Idempotency-Key': 'couriers-import-2' }),
      context()
    )

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ data: importResult, error: null })
    expect(mocks.requireIntegrationOrganization).toHaveBeenCalledTimes(1)
    expect(mocks.requireIntegrationOrganization).toHaveBeenCalledWith(
      expect.any(Request),
      'org_123',
      'billing.customers.write'
    )
    expect(mocks.importCustomers).toHaveBeenCalledTimes(1)
    expect(mocks.importCustomers).toHaveBeenCalledWith(
      'ten_123',
      {
        dryRun: false,
        duplicateStrategy: 'skip',
        rows: [{ rowNumber: 2, name: 'Island Supplies' }],
      },
      {
        sourceAppId: 'app_couriers',
        idempotencyKey: 'couriers-import-2',
      }
    )
  })

  it('accepts a dry-run preview without an idempotency key', async () => {
    const dryRunResult = { ...importResult, dryRun: true }
    mocks.importCustomers.mockResolvedValue({
      data: dryRunResult,
      error: null,
    })

    const response = await POST(
      request({
        dryRun: true,
        duplicateStrategy: 'skip',
        rows: [{ rowNumber: 2, name: 'Island Supplies' }],
      }),
      context()
    )

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ data: dryRunResult, error: null })
    expect(mocks.importCustomers).toHaveBeenCalledWith(
      'ten_123',
      {
        dryRun: true,
        duplicateStrategy: 'skip',
        rows: [{ rowNumber: 2, name: 'Island Supplies' }],
      },
      undefined
    )
  })

  it('returns 400 for a strict-body failure without calling the service', async () => {
    const response = await POST(
      request({
        duplicateStrategy: 'skip',
        rows: [
          { rowNumber: 2, name: 'Island Supplies', customerType: 'EXTERNAL' },
        ],
      }),
      context()
    )

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({
      data: null,
      error: {
        code: 'error/bad-request',
        message: 'Enter valid customer import details.',
      },
    })
    expect(mocks.importCustomers).not.toHaveBeenCalled()
  })

  it('requires an idempotency key for non-dry-run product imports', async () => {
    const response = await POST(
      request({
        duplicateStrategy: 'update',
        rows: [{ rowNumber: 3, name: 'Island Supplies' }],
      }),
      context()
    )

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({
      data: null,
      error: {
        code: 'error/bad-request',
        message:
          'Provide an Idempotency-Key header between 1 and 255 characters.',
      },
    })
    expect(mocks.importCustomers).not.toHaveBeenCalled()
  })

  it('returns the scope denial without parsing or importing the body', async () => {
    const denial = Response.json(
      {
        data: null,
        error: {
          code: 'auth/forbidden',
          message: 'The app finance connection lacks the required scope.',
        },
      },
      { status: 403 }
    )
    mocks.requireIntegrationOrganization.mockResolvedValue({
      tenant: null,
      connection: null,
      sourceAppId: null,
      platformAdmin: false,
      response: denial,
    })

    const response = await POST(
      request({ duplicateStrategy: 'skip', rows: [] }),
      context()
    )

    expect(response.status).toBe(403)
    expect(await response.json()).toEqual({
      data: null,
      error: {
        code: 'auth/forbidden',
        message: 'The app finance connection lacks the required scope.',
      },
    })
    expect(mocks.importCustomers).not.toHaveBeenCalled()
  })
})
