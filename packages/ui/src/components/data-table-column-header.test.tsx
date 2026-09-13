import { render, screen } from '@testing-library/react'
import type { LegacyColumn } from '@tanstack/react-table/legacy'
import { describe, expect, it, vi } from 'vitest'

import { DataTableColumnHeader } from './data-table-column-header'

type Row = { name: string }

function createColumn(
  overrides: Partial<Record<'canSort' | 'sorted', unknown>> = {}
) {
  const { canSort = true, sorted = false } = overrides
  return {
    getCanSort: () => canSort,
    getIsSorted: () => sorted,
    getToggleSortingHandler: () => vi.fn(),
  } as unknown as LegacyColumn<Row, string>
}

describe('DataTableColumnHeader', () => {
  it('renders a plain label with no button when the column cannot sort', () => {
    render(
      <DataTableColumnHeader
        column={createColumn({ canSort: false })}
        title="Name"
      />
    )

    expect(screen.getByText('Name')).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('hides the idle sort hint until the header is hovered or focused', () => {
    const { container } = render(
      <DataTableColumnHeader column={createColumn()} title="Name" />
    )

    const icon = container.querySelector('svg')
    expect(icon).toHaveClass('opacity-0')
    expect(icon).toHaveClass('group-hover/sort:opacity-100')
  })

  it.each(['asc', 'desc'] as const)(
    'shows the %s direction icon at rest once the column is sorted',
    (sorted) => {
      const { container } = render(
        <DataTableColumnHeader column={createColumn({ sorted })} title="Name" />
      )

      expect(container.querySelector('svg')).not.toHaveClass('opacity-0')
    }
  )
})
