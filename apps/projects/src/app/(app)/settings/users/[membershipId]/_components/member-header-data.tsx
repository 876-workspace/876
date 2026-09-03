import { notFound } from 'next/navigation'
import { AppError } from '@876/ui/app-error'
import { DetailCardHeader } from '@876/ui/detail-card'

import { requireProjectsContext } from '@/lib/auth/require-projects-context'

import { loadMember } from '../../_data'
import { MemberCardHeader } from './member-card'

export async function MemberHeaderData({
  membershipId,
}: {
  membershipId: string
}) {
  const context = await requireProjectsContext()
  const { member, error } = await loadMember(context.orgId, membershipId)
  if (error)
    return (
      <DetailCardHeader
        closeHref="/settings/users"
        closeLabel="Close user details"
        title="User unavailable"
      >
        <AppError
          title="User could not be loaded"
          error={error}
          variant="banner"
        />
      </DetailCardHeader>
    )
  if (!member) notFound()

  return <MemberCardHeader member={member} />
}
