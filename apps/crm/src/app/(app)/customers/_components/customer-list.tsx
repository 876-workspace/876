'use client'

import { useMemo } from 'react'
import { useSearchParams, useSelectedLayoutSegments } from 'next/navigation'
import type { CrmCustomerRow } from '@/features/customers/types'
import { Table, TableBody, TableCell, TableRow } from '@876/ui/table'

import { CondensedCustomerRow } from './customer-row'
import { CustomersTable } from './customers-table'

type Props = {
  customers: CrmCustomerRow[]
}

/**
 * The list column in both of its forms: the full-width table when no customer
 * is open, and the condensed sidebar list when one is.
 *
 * Both forms live in one component so the surrounding grid track — not a
 * component swap — decides the width, and the status filter is applied in one
 * place rather than twice.
 */
export function CustomerList({ customers }: Props) {
  const segments = useSelectedLayoutSegments()
  const searchParams = useSearchParams()
  const selectedId = segments[0] ?? null
  const open = selectedId !== null

  // Applied here rather than in the loader because a layout receives no
  // `searchParams`. The upstream call already returns the org's full list, so
  // this is the same in-memory filter that ran before — see the follow-up note
  // in `_lib/customers-data.ts` about pushing it into the API call.
  const status = searchParams.get('status') ?? 'all'
  const rows = useMemo(() => {
    if (status === 'active')
      return customers.filter((row) => row.status === 'ACTIVE')
    if (status === 'inactive')
      return customers.filter((row) => row.status === 'INACTIVE')
    return customers
  }, [customers, status])

  if (!open) return <CustomersTable customers={rows} />

  return (
    <div className="876-card flex h-full min-h-0 flex-col overflow-hidden">
      <header className="876-header-row shrink-0 border-b px-4 py-3 text-[0.8125rem] font-semibold">
        Customers
      </header>
      <div className="876-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <Table>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell className="text-muted-foreground px-4 py-8 text-center text-xs">
                  No customers yet
                </TableCell>
              </TableRow>
            ) : (
              rows.map((customer) => (
                <CondensedCustomerRow
                  key={customer.profileId}
                  customer={customer}
                  selected={customer.profileId === selectedId}
                />
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
