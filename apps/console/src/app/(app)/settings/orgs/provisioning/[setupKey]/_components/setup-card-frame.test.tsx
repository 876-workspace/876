/** @vitest-environment jsdom */

import '@testing-library/jest-dom/vitest'

import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { SetupCardFrame } from './setup-card-frame'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/settings/orgs/provisioning/test_setup',
}))

describe('SetupCardFrame', () => {
  it('renders all static tabs synchronously with correct links and active state', () => {
    render(
      <SetupCardFrame
        setupKey="test_setup"
        title={<span>Test Setup Title</span>}
        actions={<button type="button">Delete</button>}
        footer={<span>setup_123</span>}
      >
        <div>Tab content</div>
      </SetupCardFrame>
    )

    expect(screen.getByText('Test Setup Title')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument()
    expect(screen.getByText('setup_123')).toBeInTheDocument()
    expect(screen.getByText('Tab content')).toBeInTheDocument()

    // Navigation and tabs
    const nav = screen.getByRole('navigation', { name: 'Resource categories' })
    expect(nav).toBeInTheDocument()

    const workspaceLink = screen.getByRole('link', { name: 'Workspace' })
    const currenciesLink = screen.getByRole('link', { name: 'Currencies' })
    const paymentModesLink = screen.getByRole('link', { name: 'Payment modes' })
    const paymentTermsLink = screen.getByRole('link', { name: 'Payment terms' })
    const invoicePreferencesLink = screen.getByRole('link', {
      name: 'Invoice preferences',
    })
    const taxAuthoritiesLink = screen.getByRole('link', {
      name: 'Tax authorities',
    })
    const taxRatesLink = screen.getByRole('link', { name: 'Tax rates' })

    expect(workspaceLink).toHaveAttribute(
      'href',
      '/settings/orgs/provisioning/test_setup'
    )
    expect(workspaceLink).toHaveAttribute('aria-current', 'page')

    expect(currenciesLink).toHaveAttribute(
      'href',
      '/settings/orgs/provisioning/test_setup/currency'
    )
    expect(currenciesLink).not.toHaveAttribute('aria-current')

    expect(paymentModesLink).toHaveAttribute(
      'href',
      '/settings/orgs/provisioning/test_setup/payment_mode'
    )
    expect(paymentTermsLink).toHaveAttribute(
      'href',
      '/settings/orgs/provisioning/test_setup/payment_term'
    )
    expect(invoicePreferencesLink).toHaveAttribute(
      'href',
      '/settings/orgs/provisioning/test_setup/invoice_preference'
    )
    expect(taxAuthoritiesLink).toHaveAttribute(
      'href',
      '/settings/orgs/provisioning/test_setup/tax_authority'
    )
    expect(taxRatesLink).toHaveAttribute(
      'href',
      '/settings/orgs/provisioning/test_setup/tax_rate'
    )
  })
})
