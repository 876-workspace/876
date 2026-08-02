import { DataTableSkeleton } from '@876/ui/data-table-skeleton'
import { MEMBERS_SKELETON_COLUMNS } from './_components/members-skeleton-columns'

export default function Loading() {
  return <DataTableSkeleton columns={MEMBERS_SKELETON_COLUMNS} />
}
