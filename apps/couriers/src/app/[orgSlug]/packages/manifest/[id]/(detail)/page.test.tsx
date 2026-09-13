/** @vitest-environment jsdom */

import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import ManifestOverviewPage from './page'

describe('ManifestOverviewPage', () => {
  it('renders the eventual Details section', () => {
    render(<ManifestOverviewPage />)

    expect(screen.getByText('Details')).toBeVisible()
    expect(screen.getByText('Status')).toBeVisible()
  })

  it('renders the eventual Packages section', () => {
    render(<ManifestOverviewPage />)

    expect(screen.getByRole('heading', { name: 'Packages' })).toBeVisible()
  })

  it('shows em dashes instead of record values', () => {
    const { container } = render(<ManifestOverviewPage />)

    expect(container.textContent).toContain('—')
  })

  it('contains no placeholder prose', () => {
    render(<ManifestOverviewPage />)

    expect(screen.queryByText(/will appear here/i)).toBeNull()
    expect(screen.queryByText(/coming soon/i)).toBeNull()
  })
})
