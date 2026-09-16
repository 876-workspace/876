import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { ReportLinks } from './report-links'

const PERIOD = { from: 1788220800, to: 1790812800 }

describe('ReportLinks', () => {
  it('links each other report with the period preserved', () => {
    render(<ReportLinks current="work" period={PERIOD} />)

    expect(screen.getByRole('link', { name: 'Time' })).toHaveAttribute(
      'href',
      '/reports/time?from=1788220800&to=1790812800'
    )
    expect(
      screen.getByRole('link', { name: 'Budget variance' })
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Workload' })).toBeInTheDocument()
  })

  it('renders the report being read as current text rather than a link', () => {
    render(<ReportLinks current="work" period={PERIOD} />)

    expect(screen.queryByRole('link', { name: 'Work' })).toBeNull()
    expect(screen.getByText('Work')).toHaveAttribute('aria-current', 'page')
  })

  it('offers every report on the dashboard, where none is current', () => {
    render(<ReportLinks current={null} period={PERIOD} />)

    expect(screen.getAllByRole('link')).toHaveLength(4)
  })
})
