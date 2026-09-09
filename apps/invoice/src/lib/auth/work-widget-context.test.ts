import { getError, toAppError } from '@876/core'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  requireApiPermission: vi.fn(),
  getBilling: vi.fn(),
  retrieveInvoice: vi.fn(),
}))

vi.mock('./api-permission', () => ({
  requireApiPermission: mocks.requireApiPermission,
}))
vi.mock('@/lib/services/billing', () => ({
  getBilling: mocks.getBilling,
}))

import {
  createInvoiceWorkContext,
  requireAuthorizedWorkWidgetContext,
} from './work-widget-context'

const AUTH = { orgId: 'org_1', userId: 'user_1' }

function request(query = '') {
  return new Request(`https://invoice.test/api/tasks${query}`)
}

beforeEach(() => {
  vi.resetAllMocks()
  mocks.requireApiPermission.mockResolvedValue({ response: null, ...AUTH })
  mocks.getBilling.mockResolvedValue({
    invoices: { retrieve: mocks.retrieveInvoice },
  })
  mocks.retrieveInvoice.mockResolvedValue({
    data: { id: 'inv_1', number: 'INV-001' },
    error: null,
  })
})

describe('createInvoiceWorkContext', () => {
  it('builds safe display metadata from the Billing-owned invoice', () => {
    const result = createInvoiceWorkContext({ id: 'inv/1', number: 'INV-001' })

    expect(result).toEqual({
      service: 'billing',
      resource: 'invoice',
      externalId: 'inv/1',
      label: 'INV-001',
      url: '/invoices/inv%2F1',
    })
  })
})

describe('requireAuthorizedWorkWidgetContext', () => {
  it('keeps personal Work requests free of host authorization work', async () => {
    const result = await requireAuthorizedWorkWidgetContext(request(), AUTH)

    expect(result).toEqual({ context: null, response: null })
    expect(mocks.requireApiPermission).not.toHaveBeenCalled()
    expect(mocks.getBilling).not.toHaveBeenCalled()
  })

  it('rejects partial browser context before touching Billing', async () => {
    const result = await requireAuthorizedWorkWidgetContext(
      request('?contextService=billing&contextResource=invoice'),
      AUTH
    )
    const expected = getError('work/invalid-request')

    expect(result.context).toBeNull()
    expect(result.response?.status).toBe(expected.httpStatus)
    await expect(result.response?.json()).resolves.toEqual({
      data: null,
      error: toAppError(expected),
    })
    expect(mocks.requireApiPermission).not.toHaveBeenCalled()
    expect(mocks.getBilling).not.toHaveBeenCalled()
  })

  it('rejects unsupported host types instead of widening access', async () => {
    const result = await requireAuthorizedWorkWidgetContext(
      request(
        '?contextService=crm&contextResource=request&contextId=request_other'
      ),
      AUTH
    )

    expect(result.context).toBeNull()
    expect(result.response?.status).toBe(
      getError('work/invalid-request').httpStatus
    )
    expect(mocks.requireApiPermission).not.toHaveBeenCalled()
    expect(mocks.getBilling).not.toHaveBeenCalled()
  })

  it('requires invoices.view before resolving the requested invoice', async () => {
    const response = Response.json(
      { data: null, error: { code: 'auth/forbidden', message: 'Forbidden.' } },
      { status: 403 }
    )
    mocks.requireApiPermission.mockResolvedValue({ response })

    const result = await requireAuthorizedWorkWidgetContext(
      request(
        '?contextService=billing&contextResource=invoice&contextId=inv_1'
      ),
      AUTH
    )

    expect(mocks.requireApiPermission).toHaveBeenCalledTimes(1)
    expect(mocks.requireApiPermission).toHaveBeenCalledWith('invoices.view')
    expect(result).toEqual({ context: null, response })
    expect(mocks.getBilling).not.toHaveBeenCalled()
  })

  it('fails closed when a nested authorization resolves another principal', async () => {
    mocks.requireApiPermission.mockResolvedValue({
      response: null,
      orgId: 'org_other',
      userId: 'user_1',
    })

    const result = await requireAuthorizedWorkWidgetContext(
      request(
        '?contextService=billing&contextResource=invoice&contextId=inv_1'
      ),
      AUTH
    )

    expect(result.context).toBeNull()
    expect(result.response?.status).toBe(getError('auth/forbidden').httpStatus)
    expect(mocks.getBilling).not.toHaveBeenCalled()
  })

  it('maps an exact missing invoice to a bounded Work not-found result', async () => {
    mocks.retrieveInvoice.mockResolvedValue({
      data: null,
      error: { code: 'invoice/not-found', message: 'Invoice not found.' },
    })

    const result = await requireAuthorizedWorkWidgetContext(
      request(
        '?contextService=billing&contextResource=invoice&contextId=inv_missing'
      ),
      AUTH
    )

    expect(mocks.retrieveInvoice).toHaveBeenCalledTimes(1)
    expect(mocks.retrieveInvoice).toHaveBeenCalledWith('inv_missing')
    expect(result.context).toBeNull()
    expect(result.response?.status).toBe(getError('work/not-found').httpStatus)
  })

  it('rebuilds trusted label and URL from exact Billing retrieval', async () => {
    const result = await requireAuthorizedWorkWidgetContext(
      request(
        '?contextService=billing&contextResource=invoice&contextId=inv_1&label=Spoofed&url=https%3A%2F%2Fevil.test'
      ),
      AUTH
    )

    expect(mocks.getBilling).toHaveBeenCalledTimes(1)
    expect(mocks.getBilling).toHaveBeenCalledWith('org_1')
    expect(mocks.retrieveInvoice).toHaveBeenCalledTimes(1)
    expect(mocks.retrieveInvoice).toHaveBeenCalledWith('inv_1')
    expect(result).toEqual({
      context: {
        service: 'billing',
        resource: 'invoice',
        externalId: 'inv_1',
        label: 'INV-001',
        url: '/invoices/inv_1',
      },
      response: null,
    })
  })

  it('normalizes non-not-found Billing failures to unavailable', async () => {
    mocks.retrieveInvoice.mockResolvedValue({
      data: null,
      error: { code: 'provider/error', message: 'Sensitive upstream detail.' },
    })

    const result = await requireAuthorizedWorkWidgetContext(
      request(
        '?contextService=billing&contextResource=invoice&contextId=inv_1'
      ),
      AUTH
    )
    const expected = getError('error/unavailable')

    expect(result.context).toBeNull()
    expect(result.response?.status).toBe(expected.httpStatus)
    await expect(result.response?.json()).resolves.toEqual({
      data: null,
      error: toAppError(expected),
    })
  })
})
