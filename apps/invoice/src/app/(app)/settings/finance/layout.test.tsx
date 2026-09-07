// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getContext: vi.fn(),
  resolveAccess: vi.fn(),
  requireAppPermission: vi.fn(),
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

import FinanceSettingsLayout from './layout'

describe('FinanceSettingsLayout', () => {
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

  it('renders all 3 tabs when user has all finance read permissions', async () => {
    render(
      await FinanceSettingsLayout({
        children: <div data-testid="child-content" />,
      })
    )
    expect(screen.getByRole('link', { name: 'Currencies' })).toHaveAttribute(
      'href',
      '/settings/finance/currencies'
    )
    expect(screen.getByRole('link', { name: 'Payment modes' })).toHaveAttribute(
      'href',
      '/settings/finance/payment-modes'
    )
    expect(screen.getByRole('link', { name: 'Taxes' })).toHaveAttribute(
      'href',
      '/settings/finance/taxes'
    )
    expect(screen.getByTestId('child-content')).toBeInTheDocument()
  })

  it('renders only currencies tab when user only has currencies:read', async () => {
    mocks.resolveAccess.mockResolvedValue({
      status: 'ok',
      viewer: { permissions: ['currencies:read'] },
    })
    render(
      await FinanceSettingsLayout({
        children: <div data-testid="child-content" />,
      })
    )
    expect(screen.getByRole('link', { name: 'Currencies' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Payment modes' })).toBeNull()
    expect(screen.queryByRole('link', { name: 'Taxes' })).toBeNull()
  })

  it('renders only payment modes tab when user only has payments:read', async () => {
    mocks.resolveAccess.mockResolvedValue({
      status: 'ok',
      viewer: { permissions: ['payments:read'] },
    })
    render(
      await FinanceSettingsLayout({
        children: <div data-testid="child-content" />,
      })
    )
    expect(screen.queryByRole('link', { name: 'Currencies' })).toBeNull()
    expect(
      screen.getByRole('link', { name: 'Payment modes' })
    ).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Taxes' })).toBeNull()
  })

  it('renders only taxes tab when user only has taxes:read', async () => {
    mocks.resolveAccess.mockResolvedValue({
      status: 'ok',
      viewer: { permissions: ['taxes:read'] },
    })
    render(
      await FinanceSettingsLayout({
        children: <div data-testid="child-content" />,
      })
    )
    expect(screen.queryByRole('link', { name: 'Currencies' })).toBeNull()
    expect(screen.queryByRole('link', { name: 'Payment modes' })).toBeNull()
    expect(screen.getByRole('link', { name: 'Taxes' })).toBeInTheDocument()
  })

  it('renders scoped access error without tabs when viewer has no finance permissions', async () => {
    mocks.resolveAccess.mockResolvedValue({
      status: 'ok',
      viewer: { permissions: [] },
    })
    render(
      await FinanceSettingsLayout({
        children: <div data-testid="child-content" />,
      })
    )
    expect(
      screen.getByText('Finance settings are unavailable')
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('navigation', { name: 'Finance settings' })
    ).toBeNull()
    expect(screen.queryByTestId('child-content')).toBeNull()
  })

  it('renders scoped access error when context resolution fails', async () => {
    mocks.getContext.mockResolvedValue({ status: 'unavailable' })
    render(
      await FinanceSettingsLayout({
        children: <div data-testid="child-content" />,
      })
    )
    expect(
      screen.getByText('Finance settings are unavailable')
    ).toBeInTheDocument()
  })

  it('renders scoped access error when finance access resolution is not ok', async () => {
    mocks.resolveAccess.mockResolvedValue({
      status: 'unavailable',
      code: 'billing/internal-key-unavailable',
    })
    render(
      await FinanceSettingsLayout({
        children: <div data-testid="child-content" />,
      })
    )
    expect(
      screen.getByText('Finance settings are unavailable')
    ).toBeInTheDocument()
  })

  it('verifies settings.view permission is required', async () => {
    render(await FinanceSettingsLayout({ children: null }))
    expect(mocks.requireAppPermission).toHaveBeenCalledWith('settings.view')
  })
})
