/** @vitest-environment jsdom */

import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import DisputeOverviewPage from './page'

describe('DisputeOverviewPage', () => {
  it('renders the eventual Details section', () => {
    render(<DisputeOverviewPage />)

    expect(screen.getByText('Details')).toBeVisible()
    expect(screen.getByText('Customer')).toBeVisible()
    expect(screen.getByText('Reason')).toBeVisible()
    expect(screen.getByText('Status')).toBeVisible()
  })

  it('renders the eventual Activity section', () => {
    render(<DisputeOverviewPage />)

    expect(screen.getByText('Activity')).toBeVisible()
  })

  it('shows em dashes instead of record values', () => {
    const { container } = render(<DisputeOverviewPage />)

    expect(container.textContent).toContain('—')
  })

  it('contains no placeholder prose', () => {
    render(<DisputeOverviewPage />)

    expect(screen.queryByText(/will appear here/i)).toBeNull()
    expect(screen.queryByText(/coming soon/i)).toBeNull()
  })
})
