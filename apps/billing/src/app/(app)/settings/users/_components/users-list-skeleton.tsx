import { DataTableSkeleton } from '@876/ui/data-table-skeleton'
import { USERS_SKELETON_COLUMNS } from './users-skeleton-columns'
export function UsersListSkeleton() { return <div className="flex h-full min-h-0 flex-col gap-3"><DataTableSkeleton columns={USERS_SKELETON_COLUMNS} /></div> }
