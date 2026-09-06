import { notFound } from 'next/navigation'
import { AppError } from '@876/ui/app-error'
import { getWorkspaceContext } from '@/lib/auth/billing-context'
import { loadMember } from '../../_data'
import { MemberCardHeader } from './member-card'
export async function MemberHeaderData({
  membershipId,
}: {
  membershipId: string
}) {
  const context = await getWorkspaceContext()
  if (!context) notFound()
  const result = await loadMember(context.orgId, membershipId)
  if (result.error)
    return (
      <AppError
        title="User could not be loaded"
        error={result.error}
        variant="banner"
      />
    )
  if (!result.member) notFound()
  return <MemberCardHeader member={result.member} />
}
