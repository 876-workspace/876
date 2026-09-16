import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { CapacityTable, type CapacityRow } from './capacity-table'

function row(overrides: Partial<CapacityRow> = {}): CapacityRow {
  return {
    id: 'cap_1',
    member: 'Ada',
    minutesPerWeek: 2250,
    effectiveFrom: 1788220800,
    effectiveTo: null,
    ...overrides,
  }
}

describe('CapacityTable', () => {
  it('renders a week of capacity as hours', () => {
    render(<CapacityTable rows={[row()]} />)

    expect(screen.getByText('37.5h')).toBeInTheDocument()
  })

  it('lists an open-ended week without an end date', () => {
    render(<CapacityTable rows={[row()]} />)

    expect(screen.getByText('Sep 1, 2026')).toBeInTheDocument()
    expect(screen.getByText('—')).toBeInTheDocument()
  })

  it('links each row to its editor', () => {
    render(<CapacityTable rows={[row()]} />)

    expect(screen.getByRole('link', { name: 'Edit' })).toHaveAttribute(
      'href',
      '/settings/capacity/cap_1/edit'
    )
  })

  it('renders a short empty state', () => {
    render(<CapacityTable rows={[]} />)

    expect(screen.getByText('No capacity recorded')).toBeInTheDocument()
  })
})
