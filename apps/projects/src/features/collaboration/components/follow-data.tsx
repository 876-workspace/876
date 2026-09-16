import { projects } from '@/lib/services/projects'

import { FollowButton } from './follow-button'
import type { FollowSubjectType } from '@/lib/client/collaboration'

/**
 * Loads the acting user's follow state, then renders the switch.
 *
 * Follow state is personal, so the check filters the subject's followers
 * to the acting user rather than exposing the follower list.
 */
export async function FollowData({
  orgId,
  userId,
  subjectType,
  subjectId,
}: {
  orgId: string
  userId: string
  subjectType: FollowSubjectType
  subjectId: string
}) {
  const result = await projects.followers.list(orgId, {
    subjectType,
    subjectId,
    limit: 100,
  })
  const following = result.data
    ? result.data.data.some((follower) => follower.userId === userId)
    : false

  return (
    <FollowButton
      subjectType={subjectType}
      subjectId={subjectId}
      initialFollowing={following}
    />
  )
}
