import { DataTableSkeleton } from '@876/ui/data-table-skeleton'

import { TEAM_SKELETON_COLUMNS } from './team-skeleton-columns'

/** Fallback for the member list while the access grants are in flight. */
export function TeamListSkeleton() {
  return <DataTableSkeleton columns={TEAM_SKELETON_COLUMNS} />
}
