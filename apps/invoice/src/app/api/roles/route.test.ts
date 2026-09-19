import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { withImpliedFinancePermissions } from '@876/core/access/finance-catalog'

const mocks = vi.hoisted(() => ({
  context: vi.fn(),
  manager: vi.fn(),
  getBilling: vi.fn(),
  create: vi.fn(),
}))

vi.mock('@/lib/auth/context', () => ({ getInvoiceContextResult: mocks.context }))
vi.mock('@/lib/auth/finance-access', () => ({ requireFinanceRoleManager: mocks.manager }))
vi.mock('@/lib/clients/billing', () => ({ getBilling: mocks.getBilling }))

import { POST } from './route'

const SECURITY_INPUTS = [
  '<script>alert(1)</script>',
  "' OR '1'='1",
  '../../etc/passwd',
  '__proto__',
  '\u0000',
  '\u202e',
  'a'.repeat(1_000),
] as const

function request(body: unknown) {
  return new NextRequest('http://invoice.test/api/roles', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

function validBody(overrides: Record<string, unknown> = {}) {
  return {
    name: 'Receivables clerk',
    slug: 'receivables_clerk',
    description: 'Posts customer invoices.',
    permissions: ['billing:access', 'roles:read'],
    ...overrides,
  }
}

describe('POST /api/roles', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.context.mockResolvedValue({ status: 'ok', context: { orgId: 'org_invoice' } })
    mocks.manager.mockResolvedValue({ viewer: { tenantId: 'ten_invoice', permissions: ['roles:write'] }, response: null })
    mocks.getBilling.mockResolvedValue({ roles: { create: mocks.create } })
    mocks.create.mockResolvedValue({ data: { object: 'billing_role', id: 'Role_receivables' }, error: null })
  })

  it.each(SECURITY_INPUTS)('accepts a safe description containing %j without changing its finance grants', async (description) => {
    const body = validBody({ description })

    const response = await POST(request(body))

    expect(response.status).toBe(201)
    expect(await response.json()).toEqual({ data: { object: 'billing_role', id: 'Role_receivables' }, error: null })
    expect(mocks.context).toHaveBeenCalledTimes(1)
    expect(mocks.manager).toHaveBeenCalledTimes(1)
    expect(mocks.manager).toHaveBeenCalledWith('org_invoice')
    expect(mocks.getBilling).toHaveBeenCalledTimes(1)
    expect(mocks.getBilling).toHaveBeenCalledWith('org_invoice')
    expect(mocks.create).toHaveBeenCalledTimes(1)
    expect(mocks.create).toHaveBeenCalledWith({ ...body, permissions: withImpliedFinancePermissions(body.permissions) })
  })

  it.each([
    {},
    validBody({ name: '' }),
    validBody({ name: '   ' }),
    validBody({ slug: 'bad slug' }),
    validBody({ unknown: true }),
    validBody({ description: 'a'.repeat(2_001) }),
    validBody({ name: 123 }),
    validBody({ permissions: ['roles:read', 7] }),
  ])('rejects an invalid role body without touching Billing', async (body) => {
    const response = await POST(request(body))

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({ data: null, error: { code: 'invoice/invalid-request', message: 'Invalid request body.' } })
    expect(mocks.context).toHaveBeenCalledTimes(1)
    expect(mocks.manager).toHaveBeenCalledTimes(1)
    expect(mocks.manager).toHaveBeenCalledWith('org_invoice')
    expect(mocks.getBilling).toHaveBeenCalledTimes(0)
    expect(mocks.create).toHaveBeenCalledTimes(0)
  })

  it('rejects invalid JSON without touching the Billing client', async () => {
    const response = await POST(new NextRequest('http://invoice.test/api/roles', { method: 'POST', body: '{' }))

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({ data: null, error: { code: 'invoice/invalid-request', message: 'Invalid request body.' } })
    expect(mocks.context).toHaveBeenCalledTimes(1)
    expect(mocks.manager).toHaveBeenCalledTimes(1)
    expect(mocks.getBilling).toHaveBeenCalledTimes(0)
    expect(mocks.create).toHaveBeenCalledTimes(0)
  })

  it('returns 401 without resolving finance access for a signed-out caller', async () => {
    mocks.context.mockResolvedValue({ status: 'signed-out' })

    const response = await POST(request(validBody()))

    expect(response.status).toBe(401)
    expect(await response.json()).toEqual({ data: null, error: { code: 'invoice/unauthorized', message: 'Authentication is required.' } })
    expect(mocks.context).toHaveBeenCalledTimes(1)
    expect(mocks.manager).toHaveBeenCalledTimes(0)
    expect(mocks.getBilling).toHaveBeenCalledTimes(0)
    expect(mocks.create).toHaveBeenCalledTimes(0)
  })

  it('returns 503 without resolving finance access when organization resolution is unavailable', async () => {
    mocks.context.mockResolvedValue({ status: 'unavailable' })

    const response = await POST(request(validBody()))

    expect(response.status).toBe(503)
    expect(await response.json()).toEqual({ data: null, error: { code: 'invoice/access-unavailable', message: 'Access could not be verified. Try again.' } })
    expect(mocks.context).toHaveBeenCalledTimes(1)
    expect(mocks.manager).toHaveBeenCalledTimes(0)
    expect(mocks.getBilling).toHaveBeenCalledTimes(0)
    expect(mocks.create).toHaveBeenCalledTimes(0)
  })

  it('returns 403 and does not call Billing when a caller lacks roles:write', async () => {
    mocks.manager.mockResolvedValue({ viewer: null, response: Response.json({ data: null, error: { code: 'invoice/forbidden', message: 'You do not have permission to manage finance roles.' } }, { status: 403 }) })

    const response = await POST(request(validBody()))

    expect(response.status).toBe(403)
    expect(await response.json()).toEqual({ data: null, error: { code: 'invoice/forbidden', message: 'You do not have permission to manage finance roles.' } })
    expect(mocks.context).toHaveBeenCalledTimes(1)
    expect(mocks.manager).toHaveBeenCalledTimes(1)
    expect(mocks.manager).toHaveBeenCalledWith('org_invoice')
    expect(mocks.getBilling).toHaveBeenCalledTimes(0)
    expect(mocks.create).toHaveBeenCalledTimes(0)
  })

  it('returns 503 rather than 403 for an unresolved finance permission outcome', async () => {
    mocks.manager.mockResolvedValue({ viewer: null, response: Response.json({ data: null, error: { code: 'invoice/access-unavailable', message: 'Access could not be verified. Try again.' } }, { status: 503 }) })

    const response = await POST(request(validBody()))

    expect(response.status).toBe(503)
    expect(await response.json()).toEqual({ data: null, error: { code: 'invoice/access-unavailable', message: 'Access could not be verified. Try again.' } })
    expect(mocks.context).toHaveBeenCalledTimes(1)
    expect(mocks.manager).toHaveBeenCalledTimes(1)
    expect(mocks.getBilling).toHaveBeenCalledTimes(0)
    expect(mocks.create).toHaveBeenCalledTimes(0)
  })

  it('preserves the Billing error envelope', async () => {
    mocks.create.mockResolvedValue({ data: null, error: { code: 'billing/role-conflict', message: 'A role with that slug already exists.' } })

    const response = await POST(request(validBody()))

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({ data: null, error: { code: 'billing/role-conflict', message: 'A role with that slug already exists.' } })
    expect(mocks.context).toHaveBeenCalledTimes(1)
    expect(mocks.manager).toHaveBeenCalledTimes(1)
    expect(mocks.getBilling).toHaveBeenCalledTimes(1)
    expect(mocks.create).toHaveBeenCalledTimes(1)
  })
})
