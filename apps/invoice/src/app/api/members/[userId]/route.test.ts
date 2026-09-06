import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ context: vi.fn(), manager: vi.fn(), getBilling: vi.fn(), update: vi.fn() }))
vi.mock('@/lib/auth/context', () => ({ getInvoiceContextResult: mocks.context }))
vi.mock('@/lib/auth/finance-access', () => ({ requireFinanceMemberManager: mocks.manager }))
vi.mock('@/lib/services/billing', () => ({ getBilling: mocks.getBilling }))

import { PATCH } from './route'

const params = Promise.resolve({ userId: 'user_ada' })
function request(body: unknown) {
  return new NextRequest('http://invoice.test/api/members/user_ada', { method: 'PATCH', body: JSON.stringify(body) })
}
function body(overrides: Record<string, unknown> = {}) {
  return { roleId: 'Role_receivables', status: 'ACTIVE', ...overrides }
}

describe('PATCH /api/members/[userId]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.context.mockResolvedValue({ status: 'ok', context: { orgId: 'org_invoice' } })
    mocks.manager.mockResolvedValue({ viewer: { tenantId: 'ten_invoice', permissions: ['members:write'] }, response: null })
    mocks.getBilling.mockResolvedValue({ members: { update: mocks.update } })
    mocks.update.mockResolvedValue({ data: { object: 'billing_member', id: 'Member_ada' }, error: null })
  })

  it('updates the selected finance member with exact role and status', async () => {
    const response = await PATCH(request(body()), { params })

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ data: { object: 'billing_member', id: 'Member_ada' }, error: null })
    expect(mocks.context).toHaveBeenCalledTimes(1)
    expect(mocks.manager).toHaveBeenCalledTimes(1)
    expect(mocks.manager).toHaveBeenCalledWith('org_invoice')
    expect(mocks.getBilling).toHaveBeenCalledTimes(1)
    expect(mocks.getBilling).toHaveBeenCalledWith('org_invoice')
    expect(mocks.update).toHaveBeenCalledTimes(1)
    expect(mocks.update).toHaveBeenCalledWith('user_ada', body())
  })

  it.each([{}, body({ roleId: '' }), body({ status: 'inactive' }), body({ roleId: 3 }), body({ status: null }), body({ unknown: true })])('rejects an invalid member update without invoking Billing', async (input) => {
    const response = await PATCH(request(input), { params })

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({ data: null, error: { code: 'invoice/invalid-request', message: 'Invalid request body.' } })
    expect(mocks.context).toHaveBeenCalledTimes(1)
    expect(mocks.manager).toHaveBeenCalledTimes(1)
    expect(mocks.manager).toHaveBeenCalledWith('org_invoice')
    expect(mocks.getBilling).toHaveBeenCalledTimes(0)
    expect(mocks.update).toHaveBeenCalledTimes(0)
  })

  it('rejects malformed JSON without invoking Billing', async () => {
    const response = await PATCH(new NextRequest('http://invoice.test/api/members/user_ada', { method: 'PATCH', body: '{' }), { params })

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({ data: null, error: { code: 'invoice/invalid-request', message: 'Invalid request body.' } })
    expect(mocks.context).toHaveBeenCalledTimes(1)
    expect(mocks.manager).toHaveBeenCalledTimes(1)
    expect(mocks.getBilling).toHaveBeenCalledTimes(0)
    expect(mocks.update).toHaveBeenCalledTimes(0)
  })

  it.each([['signed-out', 401], ['unavailable', 503], ['no-organization', 403]] as const)('returns %i without invoking Billing when context is %s', async (status, expectedStatus) => {
    mocks.context.mockResolvedValue({ status })

    const response = await PATCH(request(body()), { params })

    expect(response.status).toBe(expectedStatus)
    expect(mocks.context).toHaveBeenCalledTimes(1)
    expect(mocks.manager).toHaveBeenCalledTimes(0)
    expect(mocks.getBilling).toHaveBeenCalledTimes(0)
    expect(mocks.update).toHaveBeenCalledTimes(0)
  })

  it('returns the Billing error envelope without changing it', async () => {
    mocks.update.mockResolvedValue({ data: null, error: { code: 'billing/member-self-update', message: 'You cannot change your own role.' } })

    const response = await PATCH(request(body()), { params })

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({ data: null, error: { code: 'billing/member-self-update', message: 'You cannot change your own role.' } })
    expect(mocks.context).toHaveBeenCalledTimes(1)
    expect(mocks.manager).toHaveBeenCalledTimes(1)
    expect(mocks.getBilling).toHaveBeenCalledTimes(1)
    expect(mocks.update).toHaveBeenCalledTimes(1)
  })
})
