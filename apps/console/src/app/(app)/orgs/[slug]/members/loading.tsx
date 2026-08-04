import { Button } from '@876/ui/button'
import { DataTableSkeleton } from '@876/ui/data-table-skeleton'
import { MEMBERS_SKELETON_COLUMNS } from './_components/members-skeleton-columns'

export default function Loading() {
  return (
    <div>
      <div className="mb-5 flex items-center justify-between gap-4">
        <h2 className="876-page-title">Members</h2>
        <Button variant="info" size="sm" disabled>
          Invite Member
        </Button>
      </div>
      <DataTableSkeleton columns={MEMBERS_SKELETON_COLUMNS} />
    </div>
  )
}
