/** @vitest-environment jsdom */

import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import DeliveryOverviewPage from './page'

describe('DeliveryOverviewPage', () => {
  it('renders the eventual Details section', () => {
    render(<DeliveryOverviewPage />)

    expect(screen.getByText('Details')).toBeVisible()
    expect(screen.getByText('Customer')).toBeVisible()
    expect(screen.getByText('Status')).toBeVisible()
  })

  it('renders the eventual Packages section', () => {
    render(<DeliveryOverviewPage />)

    expect(screen.getByRole('heading', { name: 'Packages' })).toBeVisible()
  })

  it('shows em dashes instead of record values', () => {
    const { container } = render(<DeliveryOverviewPage />)

    expect(container.textContent).toContain('—')
  })

  it('contains no placeholder prose', () => {
    render(<DeliveryOverviewPage />)

    expect(screen.queryByText(/will appear here/i)).toBeNull()
    expect(screen.queryByText(/coming soon/i)).toBeNull()
  })
})
