import { AppError } from '@876/ui/app-error'

import { loadMemberLabels } from '@/features/projects/member-labels'
import { projects } from '@/lib/services/projects'

import { CapacityTable, type CapacityRow } from './capacity-table'

export async function CapacityListData({ orgId }: { orgId: string }) {
  const [capacityResult, members] = await Promise.all([
    projects.capacity.list(orgId),
    loadMemberLabels(orgId),
  ])

  const error = capacityResult.error ?? members.error
  const rows: CapacityRow[] = (capacityResult.data?.data ?? []).map(
    (capacity) => ({
      id: capacity.id,
      member: members.labels[capacity.userId] ?? capacity.userId,
      minutesPerWeek: capacity.minutesPerWeek,
      effectiveFrom: capacity.effectiveFrom,
      effectiveTo: capacity.effectiveTo,
    })
  )

  return (
    <div className="space-y-4">
      {error ? (
        <AppError
          title="Some capacity data could not be loaded"
          error={error}
          variant="banner"
        />
      ) : null}
      <CapacityTable rows={rows} />
    </div>
  )
}
