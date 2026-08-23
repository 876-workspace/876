import '@testing-library/jest-dom/vitest'

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { LegacyColumnDef as ColumnDef } from '@tanstack/react-table/legacy'
import { describe, expect, it, vi } from 'vitest'

import { DataTable } from './data-table'

type Row = {
  name: string
  email: string
}

const columns: ColumnDef<Row, unknown>[] = [
  {
    accessorKey: 'name',
    header: 'Name',
  },
  {
    accessorKey: 'email',
    header: 'Email',
  },
]

const rows: Row[] = [
  {
    name: 'Ada Lovelace',
    email: 'ada@example.com',
  },
]

describe('DataTable', () => {
  it('does not trigger row actions when selecting a row', async () => {
    const user = userEvent.setup()
    const onRowClick = vi.fn()
    render(
      <DataTable
        columns={columns}
        data={rows}
        enableRowSelection
        onRowClick={onRowClick}
      />
    )

    await user.click(screen.getByRole('checkbox', { name: 'Select row' }))

    expect(onRowClick).not.toHaveBeenCalled()
  })
})
