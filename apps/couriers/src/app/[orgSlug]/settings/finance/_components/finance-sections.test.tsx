/** @vitest-environment jsdom */

import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}))

import { CurrenciesSection } from './currencies-section'
import { PaymentModesSectionView } from './payment-modes-section'
import { TaxesSectionView } from './taxes-section'

describe('Finance section views', () => {
  it('renders the shared tax rate panel when taxes load', () => {
    render(
      <TaxesSectionView
        orgSlug="island-logistics"
        rates={[]}
        authorities={[]}
        canManage
        currentTimestamp={1}
        error={null}
      />
    )

    expect(
      screen.getByRole('heading', { name: 'Tax rates' })
    ).toBeInTheDocument()
  })

  it('renders a scoped tax error without the tax panel', () => {
    render(
      <TaxesSectionView
        orgSlug="island-logistics"
        rates={[]}
        authorities={[]}
        canManage
        currentTimestamp={1}
        error={{
          code: 'finance/tax-unavailable',
          message: 'Tax settings are unavailable right now. Please try again.',
        }}
      />
    )

    expect(screen.getByText('Taxes could not be loaded')).toBeVisible()
    expect(screen.queryByRole('heading', { name: 'Tax rates' })).toBeNull()
  })

  it('renders the shared payment mode panel when modes load', () => {
    render(
      <PaymentModesSectionView
        orgSlug="island-logistics"
        modes={[]}
        canManage
        error={null}
      />
    )

    expect(
      screen.getByRole('heading', { name: 'Payment modes' })
    ).toBeInTheDocument()
  })

  it('renders a scoped payment mode error without the mode panel', () => {
    render(
      <PaymentModesSectionView
        orgSlug="island-logistics"
        modes={[]}
        canManage
        error={{
          code: 'finance/payment-mode-unavailable',
          message:
            'Payment mode settings are unavailable right now. Please try again.',
        }}
      />
    )

    expect(screen.getByText('Payment modes could not be loaded')).toBeVisible()
    expect(screen.queryByRole('heading', { name: 'Payment modes' })).toBeNull()
  })

  it('states that currencies are unavailable instead of rendering an empty table', () => {
    render(<CurrenciesSection />)

    expect(screen.getByRole('heading', { name: 'Currencies' })).toBeVisible()
    expect(
      screen.getByText('Currency settings are not available in Couriers yet.')
    ).toBeVisible()
    expect(screen.queryByRole('button', { name: /add/i })).toBeNull()
  })

  it('keeps sibling sections mounted when one section fails', () => {
    render(
      <>
        <TaxesSectionView
          orgSlug="island-logistics"
          rates={[]}
          authorities={[]}
          canManage
          currentTimestamp={1}
          error={{
            code: 'finance/tax-unavailable',
            message:
              'Tax settings are unavailable right now. Please try again.',
          }}
        />
        <PaymentModesSectionView
          orgSlug="island-logistics"
          modes={[]}
          canManage
          error={null}
        />
      </>
    )

    expect(screen.getByText('Taxes could not be loaded')).toBeVisible()
    expect(
      screen.getByRole('heading', { name: 'Payment modes' })
    ).toBeInTheDocument()
  })
})
