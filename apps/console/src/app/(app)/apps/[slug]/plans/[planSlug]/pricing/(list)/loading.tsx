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
 * Scoped to this route. Held at the segment above, this fallback was also the
 * boundary over every sibling that ships its own shaped skeleton, so one
 * navigation painted neutral filler and then the real thing.
 */
export default function Loading() {
  return <DataTableSkeleton columns={COLUMNS} rows={4} />
}
