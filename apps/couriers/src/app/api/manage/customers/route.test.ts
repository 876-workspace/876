import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getManageContext: vi.fn(),
  getFinanceClient: vi.fn(),
  create: vi.fn(),
}))

vi.mock('@/lib/auth/manage-context', () => ({
  getManageContext: mocks.getManageContext,
}))
vi.mock('@/lib/finance/client', () => ({
  getFinanceClient: mocks.getFinanceClient,
}))

import { POST } from './route'

function request(body: string | Record<string, unknown>) {
  return new Request('http://couriers.test/api/manage/customers', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-876-org-slug': 'island-logistics',
    },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  }) as never
}

describe('Couriers customer create route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getManageContext.mockResolvedValue({
      orgId: 'organization_123',
      role: 'owner',
      accessStatus: 'active',
      tenant: { id: 'tenant_123' },
    })
    mocks.getFinanceClient.mockResolvedValue({
      customers: { create: mocks.create },
    })
    mocks.create.mockResolvedValue({
      data: { object: 'customer', id: 'cus_123' },
      error: null,
    })
    vi.spyOn(globalThis.crypto, 'randomUUID').mockReturnValue(
      '123e4567-e89b-42d3-a456-426614174000'
    )
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
    ['missing name', { customerKind: 'INDIVIDUAL' }],
    [
      'unknown fields',
      { customerKind: 'INDIVIDUAL', name: 'Nia Campbell', extra: true },
    ],
  ])('rejects %s with a 400', async (_case, payload) => {
    // ARRANGE — payload supplied by the table

    // ACT
    const response = await POST(request(payload))

    // ASSERT
    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({
      data: null,
      error: { code: 'error/bad-request', message: 'Invalid customer.' },
    })
    expect(mocks.getFinanceClient).not.toHaveBeenCalled()

    // AFTER — mocks are cleared in beforeEach
  })

  it('forwards the exact customer payload with a server idempotency key', async () => {
    // ARRANGE
    const payload = {
      customerKind: 'BUSINESS',
      name: '  Blue Mountain Trading  ',
      companyName: 'Blue Mountain Trading Limited',
      email: 'accounts@blue.test',
      phone: '+1 876 555 0102',
      customerNumber: 'C-1002',
      website: 'https://blue.test',
      taxRegistrationNumber: 'TRN-123',
      notes: 'Courier account',
    }

    // ACT
    const response = await POST(request(payload))

    // ASSERT
    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      data: { object: 'customer', id: 'cus_123' },
      error: null,
    })
    expect(mocks.create).toHaveBeenCalledTimes(1)
    expect(mocks.getManageContext).toHaveBeenCalledWith('island-logistics')
    expect(mocks.create).toHaveBeenCalledWith(
      'organization_123',
      {
        ...payload,
        name: 'Blue Mountain Trading',
      },
      { idempotencyKey: '123e4567-e89b-42d3-a456-426614174000' }
    )

    // AFTER — mocks are cleared in beforeEach
  })

  it('passes finance errors through unchanged', async () => {
    // ARRANGE
    mocks.create.mockResolvedValue({
      data: null,
      error: { code: 'billing/conflict', message: 'Customer already exists.' },
    })

    // ACT
    const response = await POST(
      request({ customerKind: 'INDIVIDUAL', name: 'Nia Campbell' })
    )

    // ASSERT
    expect(response.status).toBe(502)
    await expect(response.json()).resolves.toEqual({
      data: null,
      error: {
        code: 'billing/conflict',
        message: 'Customer already exists.',
      },
    })

    // AFTER — mocks are cleared in beforeEach
  })
})
