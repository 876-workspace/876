import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getManageContext: vi.fn(),
  getFinanceClient: vi.fn(),
  importCustomers: vi.fn(),
}))

vi.mock('@/lib/auth/manage-context', () => ({
  getManageContext: mocks.getManageContext,
}))
vi.mock('@/lib/finance/client', () => ({
  getFinanceClient: mocks.getFinanceClient,
}))

import { POST } from './route'

function request(body: string | Record<string, unknown>) {
  return new Request('http://couriers.test/api/manage/customers/import', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-876-org-slug': 'island-logistics',
    },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  }) as never
}

const importResult = {
  object: 'customer_import',
  dryRun: false,
  duplicateStrategy: 'skip',
  summary: { created: 1, updated: 0, skipped: 0, failed: 0 },
  results: [
    {
      rowNumber: 2,
      action: 'created',
      customerId: 'cus_123',
      error: null,
    },
  ],
}

describe('Couriers customer import route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getManageContext.mockResolvedValue({
      orgId: 'organization_123',
      role: 'admin',
      accessStatus: 'active',
      tenant: { id: 'tenant_123' },
    })
    mocks.getFinanceClient.mockResolvedValue({
      customers: { import: mocks.importCustomers },
    })
    mocks.importCustomers.mockResolvedValue({ data: importResult, error: null })
  })

  it('rejects an unauthorized request before parsing or finance calls', async () => {
    // ARRANGE
    mocks.getManageContext.mockResolvedValue(null)

    // ACT
    const response = await POST(request('{invalid'))

    // ASSERT
    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toEqual({
      data: null,
      error: { code: 'auth/no-session', message: 'Unauthorized.' },
    })
    expect(mocks.getFinanceClient).not.toHaveBeenCalled()

    // AFTER — mocks are cleared in beforeEach
  })

  it.each([
    ['malformed JSON', '{invalid'],
    ['empty rows', { dryRun: true, duplicateStrategy: 'skip', rows: [] }],
    [
      'missing import idempotency key',
      {
        dryRun: false,
        duplicateStrategy: 'skip',
        rows: [{ rowNumber: 2, name: 'Nia Campbell' }],
      },
    ],
    [
      'duplicate row numbers',
      {
        dryRun: true,
        duplicateStrategy: 'skip',
        rows: [
          { rowNumber: 2, name: 'Nia Campbell' },
          { rowNumber: 2, name: 'Blue Mountain Trading' },
        ],
      },
    ],
  ])('rejects %s with a 400', async (_case, payload) => {
    // ARRANGE — payload supplied by the table

    // ACT
    const response = await POST(request(payload))

    // ASSERT
    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({
      data: null,
      error: {
        code: 'error/bad-request',
        message: 'Invalid customer import.',
      },
    })
    expect(mocks.getFinanceClient).not.toHaveBeenCalled()

    // AFTER — mocks are cleared in beforeEach
  })

  it('omits integration options for a dry-run preview', async () => {
    // ARRANGE
    const payload = {
      dryRun: true,
      duplicateStrategy: 'update',
      rows: [{ rowNumber: 2, name: 'Nia Campbell', currency: 'JMD' }],
    }
    mocks.importCustomers.mockResolvedValue({
      data: {
        ...importResult,
        dryRun: true,
        duplicateStrategy: 'update',
      },
      error: null,
    })

    // ACT
    const response = await POST(request(payload))

    // ASSERT
    expect(response.status).toBe(200)
    expect(mocks.getManageContext).toHaveBeenCalledWith('island-logistics')
    expect(mocks.importCustomers).toHaveBeenCalledTimes(1)
    expect(mocks.importCustomers).toHaveBeenCalledWith(
      'organization_123',
      payload
    )

    // AFTER — mocks are cleared in beforeEach
  })

  it('forwards a mutating chunk with its client-generated idempotency key', async () => {
    // ARRANGE
    const payload = {
      dryRun: false,
      duplicateStrategy: 'skip',
      rows: [{ rowNumber: 2, name: 'Blue Mountain Trading' }],
      idempotencyKey: '123e4567-e89b-42d3-a456-426614174000',
    }

    // ACT
    const response = await POST(request(payload))

    // ASSERT
    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      data: importResult,
      error: null,
    })
    expect(mocks.importCustomers).toHaveBeenCalledTimes(1)
    expect(mocks.importCustomers).toHaveBeenCalledWith(
      'organization_123',
      {
        dryRun: false,
        duplicateStrategy: 'skip',
        rows: [{ rowNumber: 2, name: 'Blue Mountain Trading' }],
      },
      { idempotencyKey: '123e4567-e89b-42d3-a456-426614174000' }
    )

    // AFTER — mocks are cleared in beforeEach
  })

  it('passes finance errors through unchanged', async () => {
    // ARRANGE
    mocks.importCustomers.mockResolvedValue({
      data: null,
      error: { code: 'billing/import-failed', message: 'Import failed.' },
    })

    // ACT
    const response = await POST(
      request({
        dryRun: true,
        duplicateStrategy: 'skip',
        rows: [{ rowNumber: 2, name: 'Nia Campbell' }],
      })
    )

    // ASSERT
    expect(response.status).toBe(502)
    await expect(response.json()).resolves.toEqual({
      data: null,
      error: { code: 'billing/import-failed', message: 'Import failed.' },
    })

    // AFTER — mocks are cleared in beforeEach
  })
})
