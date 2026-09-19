import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  context: vi.fn(),
  manager: vi.fn(),
  getBilling: vi.fn(),
  retrieve: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
}))

vi.mock('@/lib/auth/context', () => ({ getInvoiceContextResult: mocks.context }))
vi.mock('@/lib/auth/finance-access', () => ({ requireFinanceRoleManager: mocks.manager }))
vi.mock('@/lib/clients/billing', () => ({ getBilling: mocks.getBilling }))

import { DELETE, PATCH } from './route'

function role(overrides: Record<string, unknown> = {}) {
  return {
    object: 'billing_role', id: 'Role_accounts', slug: 'accounts', name: 'Accounts', description: '', permissions: ['billing:access', 'roles:read', 'subscriptions:write'], isSystem: false, isDefault: false, memberCount: 0, createdAt: 1, updatedAt: 1, ...overrides,
  }
}
function body(overrides: Record<string, unknown> = {}) {
  return { name: 'Accounts receivable', description: 'Can manage invoices.', permissions: ['billing:access', 'roles:read'], ...overrides }
}
function request(input: unknown) {
  return new NextRequest('http://invoice.test/api/roles/Role_accounts', { method: 'PATCH', body: JSON.stringify(input) })
}
const params = Promise.resolve({ roleId: 'Role_accounts' })

describe('PATCH /api/roles/[roleId]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.context.mockResolvedValue({ status: 'ok', context: { orgId: 'org_invoice' } })
    mocks.manager.mockResolvedValue({ viewer: { tenantId: 'ten_invoice', permissions: ['roles:write'] }, response: null })
    mocks.getBilling.mockResolvedValue({ roles: { retrieve: mocks.retrieve, update: mocks.update, delete: mocks.remove } })
    mocks.retrieve.mockResolvedValue({ data: role(), error: null })
    mocks.update.mockResolvedValue({ data: { object: 'billing_role', id: 'Role_accounts' }, error: null })
    mocks.remove.mockResolvedValue({ data: { object: 'billing_role', id: 'Role_accounts', deleted: true }, error: null })
  })

  it('the update handler preserves subscriptions:write on a role edited from Invoice', async () => {
    const response = await PATCH(request(body()), { params })

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ data: { object: 'billing_role', id: 'Role_accounts' }, error: null })
    expect(mocks.context).toHaveBeenCalledTimes(1)
    expect(mocks.manager).toHaveBeenCalledTimes(1)
    expect(mocks.manager).toHaveBeenCalledWith('org_invoice')
    expect(mocks.getBilling).toHaveBeenCalledTimes(1)
    expect(mocks.getBilling).toHaveBeenCalledWith('org_invoice')
    expect(mocks.retrieve).toHaveBeenCalledTimes(1)
    expect(mocks.retrieve).toHaveBeenCalledWith('Role_accounts')
    expect(mocks.update).toHaveBeenCalledTimes(1)
    expect(mocks.update).toHaveBeenCalledWith('Role_accounts', { ...body(), permissions: ['billing:access', 'roles:read', 'subscriptions:write'] })
  })

  it.each([{}, body({ name: '' }), body({ name: '   ' }), body({ description: 'x'.repeat(2_001) }), body({ unknown: true }), body({ permissions: [false] })])('rejects invalid update input without reading the role', async (input) => {
    const response = await PATCH(request(input), { params })

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({ data: null, error: { code: 'invoice/invalid-request', message: 'Invalid request body.' } })
    expect(mocks.context).toHaveBeenCalledTimes(1)
    expect(mocks.manager).toHaveBeenCalledTimes(1)
    expect(mocks.getBilling).toHaveBeenCalledTimes(0)
    expect(mocks.retrieve).toHaveBeenCalledTimes(0)
    expect(mocks.update).toHaveBeenCalledTimes(0)
  })

  it('rejects invalid JSON without touching Billing', async () => {
    const response = await PATCH(new NextRequest('http://invoice.test/api/roles/Role_accounts', { method: 'PATCH', body: '{' }), { params })

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({ data: null, error: { code: 'invoice/invalid-request', message: 'Invalid request body.' } })
    expect(mocks.getBilling).toHaveBeenCalledTimes(0)
    expect(mocks.retrieve).toHaveBeenCalledTimes(0)
    expect(mocks.update).toHaveBeenCalledTimes(0)
  })

  it('returns the retrieve error without attempting an update', async () => {
    mocks.retrieve.mockResolvedValue({ data: null, error: { code: 'billing/role-not-found', message: 'Role not found.' } })

    const response = await PATCH(request(body()), { params })

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({ data: null, error: { code: 'billing/role-not-found', message: 'Role not found.' } })
    expect(mocks.getBilling).toHaveBeenCalledTimes(1)
    expect(mocks.retrieve).toHaveBeenCalledTimes(1)
    expect(mocks.update).toHaveBeenCalledTimes(0)
  })

  it.each(['signed-out', 'unavailable', 'no-organization'] as const)('does not call Billing when the context is %s', async (status) => {
    mocks.context.mockResolvedValue({ status })

    const response = await PATCH(request(body()), { params })

    expect(response.status).toBe(status === 'signed-out' ? 401 : status === 'unavailable' ? 503 : 403)
    expect(mocks.context).toHaveBeenCalledTimes(1)
    expect(mocks.manager).toHaveBeenCalledTimes(0)
    expect(mocks.getBilling).toHaveBeenCalledTimes(0)
    expect(mocks.retrieve).toHaveBeenCalledTimes(0)
    expect(mocks.update).toHaveBeenCalledTimes(0)
  })
})

describe('DELETE /api/roles/[roleId]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.context.mockResolvedValue({ status: 'ok', context: { orgId: 'org_invoice' } })
    mocks.manager.mockResolvedValue({ viewer: { tenantId: 'ten_invoice', permissions: ['roles:write'] }, response: null })
    mocks.getBilling.mockResolvedValue({ roles: { retrieve: mocks.retrieve, update: mocks.update, delete: mocks.remove } })
    mocks.remove.mockResolvedValue({ data: { object: 'billing_role', id: 'Role_accounts', deleted: true }, error: null })
  })

  it('deletes a role through exactly one Billing operation', async () => {
    const response = await DELETE(new NextRequest('http://invoice.test/api/roles/Role_accounts', { method: 'DELETE' }), { params })

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ data: { object: 'billing_role', id: 'Role_accounts', deleted: true }, error: null })
    expect(mocks.context).toHaveBeenCalledTimes(1)
    expect(mocks.manager).toHaveBeenCalledTimes(1)
    expect(mocks.manager).toHaveBeenCalledWith('org_invoice')
    expect(mocks.getBilling).toHaveBeenCalledTimes(1)
    expect(mocks.remove).toHaveBeenCalledTimes(1)
    expect(mocks.remove).toHaveBeenCalledWith('Role_accounts')
  })

  it('does not delete when finance authorization denies the caller', async () => {
    mocks.manager.mockResolvedValue({ viewer: null, response: Response.json({ data: null, error: { code: 'invoice/forbidden', message: 'You do not have permission to manage finance roles.' } }, { status: 403 }) })

    const response = await DELETE(new NextRequest('http://invoice.test/api/roles/Role_accounts', { method: 'DELETE' }), { params })

    expect(response.status).toBe(403)
    expect(await response.json()).toEqual({ data: null, error: { code: 'invoice/forbidden', message: 'You do not have permission to manage finance roles.' } })
    expect(mocks.context).toHaveBeenCalledTimes(1)
    expect(mocks.manager).toHaveBeenCalledTimes(1)
    expect(mocks.getBilling).toHaveBeenCalledTimes(0)
    expect(mocks.remove).toHaveBeenCalledTimes(0)
  })
})
