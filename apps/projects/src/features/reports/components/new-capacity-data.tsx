import { AppError } from '@876/ui/app-error'

import { loadMemberLabels } from '@/features/projects/member-labels'

import { toMemberOptions } from '../capacity-members'
import { CapacityForm } from './capacity-form'

export async function NewCapacityData({ orgId }: { orgId: string }) {
  const members = await loadMemberLabels(orgId)

  return (
    <div className="space-y-4">
      {members.error ? (
        <AppError
          title="The member list could not be loaded"
          error={members.error}
          variant="banner"
        />
      ) : null}
      <CapacityForm mode="create" members={toMemberOptions(members.labels)} />
    </div>
  )
}
