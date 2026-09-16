// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { formatRecordValue, RecordList } from './record-list'
import type { CustomModuleRecord, CustomModuleStatus } from './types'

const STATUSES: CustomModuleStatus[] = [
  { key: 'backlog', label: 'Backlog', category: 'open', position: 0 },
  { key: 'doing', label: 'Doing', category: 'in-progress', position: 1 },
]

function makeRecord(overrides?: Partial<CustomModuleRecord>): CustomModuleRecord {
  return {
    object: 'projects.custom-module-record',
    id: 'rec_1',
    moduleId: 'mod_1',
    projectId: 'proj_1',
    title: 'Fix login',
    statusKey: 'doing',
    values: { severity: 'high', estimate: 3 },
    createdAt: Date.UTC(2026, 2, 3) / 1000,
    updatedAt: Date.UTC(2026, 2, 4) / 1000,
    ...overrides,
  }
}

const COLUMNS = [
  { fieldKey: 'severity', label: 'Severity' },
  { fieldKey: 'estimate', label: 'Estimate' },
]

describe('RecordList', () => {
  afterEach(cleanup)

  it('links the record title to its detail path', () => {
    render(
      <RecordList
        records={[makeRecord()]}
        statuses={STATUSES}
        columns={COLUMNS}
        hrefBase="/records"
      />
    )

    expect(
      within(screen.getByRole('table')).getByRole('link', {
        name: 'Fix login',
      })
    ).toHaveAttribute('href', '/records/rec_1')
  })

  it('encodes the record id in the href', () => {
    render(
      <RecordList
        records={[makeRecord({ id: 'rec/one two' })]}
        hrefBase="/records"
      />
    )

    expect(
      within(screen.getByRole('table')).getByRole('link', {
        name: 'Fix login',
      })
    ).toHaveAttribute('href', '/records/rec%2Fone%20two')
  })

  it('renders the resolved status label', () => {
    render(
      <RecordList
        records={[makeRecord()]}
        statuses={STATUSES}
        hrefBase="/records"
      />
    )

    expect(
      within(screen.getByRole('table')).getByText('Doing')
    ).toBeInTheDocument()
  })

  it('renders up to four column values', () => {
    render(
      <RecordList
        records={[makeRecord()]}
        statuses={STATUSES}
        columns={COLUMNS}
        hrefBase="/records"
      />
    )

    const table = within(screen.getByRole('table'))
    expect(table.getByText('high')).toBeInTheDocument()
    expect(table.getByText('3')).toBeInTheDocument()
  })

  it('renders an em dash for an empty value', () => {
    render(
      <RecordList
        records={[makeRecord({ values: {} })]}
        columns={COLUMNS}
        hrefBase="/records"
      />
    )

    expect(
      within(screen.getByRole('table')).getAllByText('—').length
    ).toBeGreaterThan(0)
  })

  it('caps visible columns at four', () => {
    const columns = [
      { fieldKey: 'a', label: 'A' },
      { fieldKey: 'b', label: 'B' },
      { fieldKey: 'c', label: 'C' },
      { fieldKey: 'd', label: 'D' },
      { fieldKey: 'e', label: 'E' },
    ]
    render(
      <RecordList
        records={[makeRecord()]}
        columns={columns}
        hrefBase="/records"
      />
    )

    const headers = within(screen.getByRole('table'))
      .getAllByRole('columnheader')
      .map((header) => header.textContent)

    expect(headers).toEqual(['Title', 'Status', 'A', 'B', 'C', 'D', 'Updated'])
  })

  it('renders the updated date', () => {
    render(<RecordList records={[makeRecord()]} hrefBase="/records" />)

    expect(
      within(screen.getByRole('table')).getByText('Mar 4, 2026')
    ).toBeInTheDocument()
  })

  it('renders a mobile row per record', () => {
    const { container } = render(
      <RecordList records={[makeRecord()]} hrefBase="/records" />
    )
    const list = container.querySelector('ul')
    if (!list) throw new Error('Expected a mobile list')

    expect(
      within(list).getByRole('link', { name: 'View record Fix login' })
    ).toHaveAttribute('href', '/records/rec_1')
  })

  it('renders the empty state with no links', () => {
    const { container } = render(
      <RecordList records={[]} hrefBase="/records" />
    )

    expect(screen.getAllByText('No records yet')).toHaveLength(2)
    expect(container.querySelectorAll('a')).toHaveLength(0)
  })

  it('formats each value kind', () => {
    expect(formatRecordValue(null)).toBe('—')
    expect(formatRecordValue(undefined)).toBe('—')
    expect(formatRecordValue('')).toBe('—')
    expect(formatRecordValue('hi')).toBe('hi')
    expect(formatRecordValue(42)).toBe('42')
    expect(formatRecordValue(true)).toBe('Yes')
    expect(formatRecordValue(false)).toBe('No')
    expect(formatRecordValue(['a', 'b'])).toBe('a, b')
    expect(formatRecordValue([])).toBe('—')
  })
})
