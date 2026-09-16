// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { UnmappedFieldsTable } from './unmapped-fields-table'

describe('UnmappedFieldsTable', () => {
  afterEach(cleanup)

  it('renders the source and field', () => {
    render(
      <UnmappedFieldsTable
        fields={[{ source: 'jira-csv', field: 'Story Points', occurrences: 42 }]}
      />
    )
    expect(screen.getByText('jira-csv')).toBeInTheDocument()
    expect(screen.getByText('Story Points')).toBeInTheDocument()
  })

  it('renders the occurrence count', () => {
    render(
      <UnmappedFieldsTable
        fields={[{ source: 'jira-csv', field: 'Story Points', occurrences: 42 }]}
      />
    )
    expect(screen.getByText('42')).toBeInTheDocument()
  })

  it('labels the columns in table order', () => {
    render(
      <UnmappedFieldsTable
        fields={[{ source: 'jira-csv', field: 'Story Points', occurrences: 1 }]}
      />
    )
    const headers = within(screen.getByRole('table'))
      .getAllByRole('columnheader')
      .map((header) => header.textContent)
    expect(headers).toEqual(['Source', 'Field', 'Occurrences'])
  })

  it('renders the empty state', () => {
    render(<UnmappedFieldsTable fields={[]} />)
    expect(screen.getByText('No unmapped fields')).toBeInTheDocument()
  })
})
