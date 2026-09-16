// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { ImportPreviewTable } from './import-preview-table'
import type { ImportRowPreview } from './types'

function makeRow(overrides?: Partial<ImportRowPreview>): ImportRowPreview {
  return {
    rowNumber: 1,
    title: 'Migrate homepage',
    status: 'valid',
    errors: [],
    ...overrides,
  }
}

describe('ImportPreviewTable', () => {
  afterEach(cleanup)

  it('sorts invalid rows before valid rows', () => {
    render(
      <ImportPreviewTable
        rows={[
          makeRow({ rowNumber: 7, status: 'valid' }),
          makeRow({ rowNumber: 3, title: null, status: 'invalid', errors: ['Missing title'] }),
        ]}
      />
    )
    const cells = within(screen.getByRole('table')).getAllByRole('cell')
    const firstRowNumber = cells[0]?.textContent
    expect(firstRowNumber).toBe('3')
  })

  it('badges valid and invalid rows', () => {
    render(
      <ImportPreviewTable
        rows={[
          makeRow({ rowNumber: 1, status: 'valid' }),
          makeRow({ rowNumber: 2, status: 'invalid', errors: ['Bad date'] }),
        ]}
      />
    )
    expect(screen.getByText('Valid')).toBeInTheDocument()
    expect(screen.getByText('Invalid')).toBeInTheDocument()
  })

  it('lists row errors', () => {
    render(
      <ImportPreviewTable
        rows={[makeRow({ status: 'invalid', errors: ['Missing title', 'Bad date'] })]}
      />
    )
    expect(screen.getByText('Missing title')).toBeInTheDocument()
    expect(screen.getByText('Bad date')).toBeInTheDocument()
  })

  it('renders a dash for a missing title', () => {
    render(<ImportPreviewTable rows={[makeRow({ title: null })]} />)
    expect(
      within(screen.getByRole('table')).getAllByText('—').length
    ).toBeGreaterThan(0)
  })

  it('labels the columns in table order', () => {
    render(<ImportPreviewTable rows={[makeRow()]} />)
    const headers = within(screen.getByRole('table'))
      .getAllByRole('columnheader')
      .map((header) => header.textContent)
    expect(headers).toEqual(['Row', 'Title', 'Status', 'Errors'])
  })

  it('renders the empty state', () => {
    render(<ImportPreviewTable rows={[]} />)
    expect(screen.getByText('No rows to preview')).toBeInTheDocument()
  })
})
