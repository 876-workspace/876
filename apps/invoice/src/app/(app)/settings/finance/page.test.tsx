import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getContext: vi.fn(),
  resolveAccess: vi.fn(),
  requireAppPermission: vi.fn(),
  redirect: vi.fn((url: string) => {
    throw new Error(`redirect:${url}`)
  }),
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

import FinanceIndexPage from './page'

describe('FinanceIndexPage', () => {
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
        permissions: ['currencies:read', 'payments:read', 'taxes:read'],
      },
    })
  })

  it('redirects to /settings/finance/currencies when currencies:read is held', async () => {
    await expect(FinanceIndexPage()).rejects.toThrow(
      'redirect:/settings/finance/currencies'
    )
  })

  it('redirects to /settings/finance/payment-modes when only payments:read is held', async () => {
    mocks.resolveAccess.mockResolvedValue({
      status: 'ok',
      viewer: { permissions: ['payments:read'] },
    })
    await expect(FinanceIndexPage()).rejects.toThrow(
      'redirect:/settings/finance/payment-modes'
    )
  })

  it('redirects to /settings/finance/taxes when only taxes:read is held', async () => {
    mocks.resolveAccess.mockResolvedValue({
      status: 'ok',
      viewer: { permissions: ['taxes:read'] },
    })
    await expect(FinanceIndexPage()).rejects.toThrow(
      'redirect:/settings/finance/taxes'
    )
  })

  it('redirects to /settings when no finance permissions are held', async () => {
    mocks.resolveAccess.mockResolvedValue({
      status: 'ok',
      viewer: { permissions: [] },
    })
    await expect(FinanceIndexPage()).rejects.toThrow('redirect:/settings')
  })

  it('redirects to /settings when context is not ok', async () => {
    mocks.getContext.mockResolvedValue({ status: 'signed-out' })
    await expect(FinanceIndexPage()).rejects.toThrow('redirect:/settings')
  })

  it('redirects to /settings when access is unavailable', async () => {
    mocks.resolveAccess.mockResolvedValue({
      status: 'unavailable',
      code: 'err',
    })
    await expect(FinanceIndexPage()).rejects.toThrow('redirect:/settings')
  })
})
