// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { CsvExportLink } from './csv-export-link'

describe('CsvExportLink', () => {
  afterEach(cleanup)

  it('renders an anchor pointing at the export href', () => {
    render(<CsvExportLink href="/api/projects/reports/time?format=csv" />)

    expect(screen.getByRole('link', { name: 'Export CSV' })).toHaveAttribute(
      'href',
      '/api/projects/reports/time?format=csv'
    )
  })

  it('renders a download attribute', () => {
    render(<CsvExportLink href="/api/projects/reports/time?format=csv" />)

    expect(screen.getByRole('link', { name: 'Export CSV' })).toHaveAttribute(
      'download'
    )
  })

  it('renders a custom label, filename, and class', () => {
    render(
      <CsvExportLink
        href="/api/projects/reports/work?format=csv"
        label="Download report"
        download="work-report.csv"
        className="ml-2"
      />
    )

    const link = screen.getByRole('link', { name: 'Download report' })
    expect(link).toHaveAttribute('download', 'work-report.csv')
    expect(link).toHaveClass('ml-2')
  })
})
