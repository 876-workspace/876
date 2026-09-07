import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getContext: vi.fn(),
  resolveAccess: vi.fn(),
  requireAppPermission: vi.fn(),
  redirect: vi.fn((url: string) => {
    throw new Error(`redirect:${url}`)
  }),
  billing: {
    currencies: {
      list: vi.fn(),
    },
  },
}))

vi.mock('next/navigation', () => ({
  redirect: mocks.redirect,
}))

vi.mock('@/lib/auth/context', () => ({
  getInvoiceContextResult: mocks.getContext,
}))

vi.mock('@/lib/auth/finance-access', () => ({
  resolveInvoiceFinanceAccess: mocks.resolveAccess,
}))

vi.mock('@/lib/auth/guards', () => ({
  requireAppPermission: mocks.requireAppPermission,
}))

vi.mock('@/lib/services/billing', () => ({
  getBilling: vi.fn(async () => mocks.billing),
}))

import FinanceCurrenciesPage from './page'

describe('FinanceCurrenciesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.requireAppPermission.mockResolvedValue(undefined)
    mocks.getContext.mockResolvedValue({
      status: 'ok',
      context: { orgId: 'org_1', userId: 'usr_1', role: 'admin' },
    })
    mocks.resolveAccess.mockResolvedValue({
      status: 'ok',
      viewer: {
        permissions: ['currencies:read', 'currencies:write'],
      },
    })
    mocks.billing.currencies.list.mockResolvedValue({
      data: {
        object: 'list',
        data: [],
        has_more: false,
        url: '/api/v1/currencies',
        total_count: 0,
      },
      error: null,
    })
  })

  it('redirects to /settings/finance when user lacks currencies:read', async () => {
    mocks.resolveAccess.mockResolvedValue({
      status: 'ok',
      viewer: { permissions: ['payments:read'] },
    })
    await expect(FinanceCurrenciesPage()).rejects.toThrow(
      'redirect:/settings/finance'
    )
  })

  it('redirects to /settings/finance when context is not ok', async () => {
    mocks.getContext.mockResolvedValue({ status: 'signed-out' })
    await expect(FinanceCurrenciesPage()).rejects.toThrow(
      'redirect:/settings/finance'
    )
  })

  it('redirects to /settings/finance when access is unavailable', async () => {
    mocks.resolveAccess.mockResolvedValue({
      status: 'unavailable',
      code: 'err',
    })
    await expect(FinanceCurrenciesPage()).rejects.toThrow(
      'redirect:/settings/finance'
    )
  })

  it('renders currencies suspense wrapper when authorized', async () => {
    const result = await FinanceCurrenciesPage()
    expect(result).toBeDefined()
  })
})
