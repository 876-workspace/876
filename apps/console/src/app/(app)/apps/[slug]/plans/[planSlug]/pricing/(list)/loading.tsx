import { DataTableSkeleton } from '@876/ui/data-table-skeleton'

const COLUMNS = [
  { label: 'Name' },
  { label: 'Amount' },
  { label: 'Model' },
  { label: 'Billing' },
  { label: 'Flags' },
  { label: 'Status' },
]

/**
 * Scoped to the pricing list alone. It sits inside the `(list)` group because a
 * `loading.tsx` at the `pricing/` segment is also the boundary above `new/`,
 * so opening the price form painted this table skeleton first.
 */
export default function Loading() {
  return <DataTableSkeleton columns={COLUMNS} rows={4} />
}
