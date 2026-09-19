import { AppError } from '@876/ui/app-error'
import { notFound } from 'next/navigation'

import { loadMemberLabels } from '@/features/projects/member-labels'
import { projects } from '@/lib/clients/projects'

import { toMemberOptions } from '../capacity-members'
import { CapacityForm } from './capacity-form'

export async function EditCapacityData({
  orgId,
  capacityId,
}: {
  orgId: string
  capacityId: string
}) {
  const decoded = decodeURIComponent(capacityId)
  const [capacityResult, members] = await Promise.all([
    projects.capacity.list(orgId),
    loadMemberLabels(orgId),
  ])

  const capacity =
    (capacityResult.data?.data ?? []).find((row) => row.id === decoded) ?? null

  if (capacity === null && capacityResult.error === null) notFound()

  if (capacity === null)
    return (
      <AppError
        title="The capacity could not be loaded"
        error={
          capacityResult.error ?? {
            code: 'projects/capacity-unavailable',
            message: 'The capacity could not be loaded.',
          }
        }
        variant="banner"
      />
    )

  return (
    <div className="space-y-4">
      {members.error ? (
        <AppError
          title="The member list could not be loaded"
          error={members.error}
          variant="banner"
        />
      ) : null}
      <CapacityForm
        mode="edit"
        members={toMemberOptions(members.labels)}
        capacity={capacity}
      />
    </div>
  )
}
