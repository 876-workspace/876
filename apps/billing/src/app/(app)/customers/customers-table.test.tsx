/** @vitest-environment jsdom */

import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ColumnDef } from '@tanstack/react-table'

import type { CustomerTableRow } from '@/types/customer'

const mocks = vi.hoisted(() => ({ push: vi.fn() }))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mocks.push }),
}))
vi.mock('@876/ui/data-table', () => ({
  DataTable: ({
    columns,
    data,
  }: {
    columns: ColumnDef<CustomerTableRow, unknown>[]
    data: CustomerTableRow[]
  }) => (
    <table>
      <thead>
        <tr>
          {columns.map((column, index) => (
            <th key={index}>
              {typeof column.header === 'string'
                ? column.header
                : typeof column.header === 'function'
                  ? column.header({} as never)
                  : null}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.map((customer) => (
          <tr key={customer.id}>
            {columns.map((column, index) => (
              <td key={index}>
                {typeof column.cell === 'function'
                  ? column.cell({ row: { original: customer } } as never)
                  : null}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  ),
}))

import { CustomersTable } from './customers-table'

function customer(overrides: Partial<CustomerTableRow> = {}): CustomerTableRow {
  return {
    id: 'cus_876',
    name: 'Island Supply Co.',
    customerNumber: 'C-876',
    companyName: 'Island Supply Company',
    phone: '876-555-0112',
    receivables: 12500,
    currency: 'JMD',
    status: 'ACTIVE',
    ...overrides,
  }
}

describe('CustomersTable', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders customer numbers and the missing-value fallback', () => {
    render(
      <CustomersTable
        customers={[
          customer(),
          customer({
            id: 'cus_877',
            name: 'Harbour Studio',
            customerNumber: null,
          }),
        ]}
      />
    )

    expect(screen.getByRole('columnheader', { name: 'Number' })).toBeVisible()
    expect(screen.getByText('C-876')).toBeVisible()
    expect(screen.getByText('—')).toBeVisible()
  })
})
