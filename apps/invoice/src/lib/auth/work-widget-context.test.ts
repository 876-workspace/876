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
  requireAuthorizedInvoiceWorkContext,
} from './work-widget-context'

const AUTH = { orgId: 'org_1', userId: 'user_1' }

beforeEach(() => {
  vi.resetAllMocks()
  mocks.requireApiPermission.mockResolvedValue({ response: null, ...AUTH })
  mocks.getBilling.mockResolvedValue({
    invoices: { retrieve: mocks.retrieveInvoice },
  })
  mocks.retrieveInvoice.mockResolvedValue({
    data: { object: 'invoice', id: 'inv_1', number: 'INV-001' },
    error: null,
  })
})

describe('createInvoiceWorkContext', () => {
  it('builds safe display metadata from a valid invoice number', () => {
    const result = createInvoiceWorkContext({
      object: 'invoice',
      id: 'inv/1',
      number: 'INV-001',
    })

    expect(result).toEqual({
      service: 'billing',
      resource: 'invoice',
      externalId: 'inv/1',
      label: 'INV-001',
      url: '/invoices/inv%2F1',
    })
  })

  it('trims leading and trailing whitespace from a valid invoice number', () => {
    const result = createInvoiceWorkContext({
      object: 'invoice',
      id: 'inv_2',
      number: '  INV-999  ',
    })

    expect(result.label).toBe('INV-999')
  })

  it('falls back to invoice ID when number is omitted', () => {
    const result = createInvoiceWorkContext({
      object: 'invoice',
      id: 'inv_fallback_1',
    })

    expect(result.label).toBe('inv_fallback_1')
  })

  it('falls back to invoice ID when number is undefined', () => {
    const result = createInvoiceWorkContext({
      object: 'invoice',
      id: 'inv_fallback_2',
      number: undefined,
    })

    expect(result.label).toBe('inv_fallback_2')
  })

  it('falls back to invoice ID when number is non-string', () => {
    const resultNumber = createInvoiceWorkContext({
      object: 'invoice',
      id: 'inv_fallback_num',
      number: 12345,
    })
    const resultBool = createInvoiceWorkContext({
      object: 'invoice',
      id: 'inv_fallback_bool',
      number: false,
    })
    const resultObj = createInvoiceWorkContext({
      object: 'invoice',
      id: 'inv_fallback_obj',
      number: { value: 'INV-001' },
    })

    expect(resultNumber.label).toBe('inv_fallback_num')
    expect(resultBool.label).toBe('inv_fallback_bool')
    expect(resultObj.label).toBe('inv_fallback_obj')
  })

  it('falls back to invoice ID when number is empty string or whitespace only', () => {
    const resultEmpty = createInvoiceWorkContext({
      object: 'invoice',
      id: 'inv_fallback_empty',
      number: '',
    })
    const resultSpaces = createInvoiceWorkContext({
      object: 'invoice',
      id: 'inv_fallback_spaces',
      number: '   ',
    })

    expect(resultEmpty.label).toBe('inv_fallback_empty')
    expect(resultSpaces.label).toBe('inv_fallback_spaces')
  })
})

describe('requireAuthorizedInvoiceWorkContext', () => {
  it('rejects a blank route resource before touching Billing', async () => {
    const result = await requireAuthorizedInvoiceWorkContext(' ', AUTH)
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

  it('requires invoices.view before resolving the requested invoice', async () => {
    const response = Response.json(
      { data: null, error: { code: 'auth/forbidden', message: 'Forbidden.' } },
      { status: 403 }
    )
    mocks.requireApiPermission.mockResolvedValue({ response })

    const result = await requireAuthorizedInvoiceWorkContext('inv_1', AUTH)

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

    const result = await requireAuthorizedInvoiceWorkContext('inv_1', AUTH)

    expect(result.context).toBeNull()
    expect(result.response?.status).toBe(getError('auth/forbidden').httpStatus)
    expect(mocks.getBilling).not.toHaveBeenCalled()
  })

  it('maps an exact missing invoice to a bounded Work not-found result', async () => {
    mocks.retrieveInvoice.mockResolvedValue({
      data: null,
      error: { code: 'invoice/not-found', message: 'Invoice not found.' },
    })

    const result = await requireAuthorizedInvoiceWorkContext(
      'inv_missing',
      AUTH
    )

    expect(mocks.retrieveInvoice).toHaveBeenCalledTimes(1)
    expect(mocks.retrieveInvoice).toHaveBeenCalledWith('inv_missing')
    expect(result.context).toBeNull()
    expect(result.response?.status).toBe(getError('work/not-found').httpStatus)
  })

  it('rebuilds trusted label and URL from exact Billing retrieval', async () => {
    const result = await requireAuthorizedInvoiceWorkContext('inv_1', AUTH)

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

    const result = await requireAuthorizedInvoiceWorkContext('inv_1', AUTH)
    const expected = getError('error/unavailable')

    expect(result.context).toBeNull()
    expect(result.response?.status).toBe(expected.httpStatus)
    await expect(result.response?.json()).resolves.toEqual({
      data: null,
      error: toAppError(expected),
    })
  })
})
