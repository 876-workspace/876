/** @vitest-environment jsdom */

import { render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('./taxes-section', () => ({
  TaxesSection: () => <section aria-label="Taxes">Tax rates content</section>,
}))

vi.mock('./currencies-section', () => ({
  CurrenciesSection: () => (
    <section aria-label="Currencies">Currencies</section>
  ),
}))

vi.mock('./payment-modes-section', () => ({
  PaymentModesSection: () => (
    <section aria-label="Payment modes">Payment modes content</section>
  ),
}))

import { FinancePageContent } from './finance-page'

function sectionIds() {
  return Array.from(document.querySelectorAll('[data-finance-section]')).map(
    (element) => element.getAttribute('data-finance-section')
  )
}

describe('Couriers finance settings page', () => {
  it('stacks taxes, currencies and payment modes as separate sections in order', () => {
    render(
      <FinancePageContent orgSlug="island-logistics" orgId="org_1" canManage />
    )

    expect(sectionIds()).toEqual(['taxes', 'currencies', 'payment-modes'])
    expect(screen.getByText('Tax rates content')).toBeVisible()
    expect(screen.getByText('Payment modes content')).toBeVisible()
  })

  it('renders a sticky in-page index linking to each section anchor', () => {
    render(
      <FinancePageContent orgSlug="island-logistics" orgId="org_1" canManage />
    )

    const nav = screen.getByRole('navigation', { name: 'Finance sections' })
    expect(
      within(nav)
        .getAllByRole('link')
        .map((link) => link.getAttribute('href'))
    ).toEqual(['#taxes', '#currencies', '#payment-modes'])
  })

  it('renders no tax authority surface', () => {
    render(
      <FinancePageContent orgSlug="island-logistics" orgId="org_1" canManage />
    )

    expect(screen.queryByText(/tax authorit/i)).toBeNull()
  })
})
