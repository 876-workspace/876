'use client'

import { Button } from '@876/ui/button'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { followsClient } from '@/lib/client/collaboration'
import type { FollowSubjectType } from '@/types/collaboration'

type FollowButtonProps = {
  subjectType: FollowSubjectType
  subjectId: string
  initialFollowing: boolean
}

/**
 * Personal follow switch for a project, phase, or work item.
 *
 * Follows drive notifications, so this is per-user state: the acting user
 * always comes from the session in the route handler, never from the
 * browser payload.
 */
export function FollowButton({
  subjectType,
  subjectId,
  initialFollowing,
}: FollowButtonProps) {
  const router = useRouter()
  const [following, setFollowing] = useState(initialFollowing)
  const [pending, setPending] = useState(false)

  async function toggle() {
    if (pending) return
    setPending(true)
    const result = await followsClient.setFollowed(
      subjectType,
      subjectId,
      !following
    )
    setPending(false)
    if (result.error || !result.data) return
    setFollowing(result.data.following)
    router.refresh()
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      aria-pressed={following}
      disabled={pending}
      onClick={toggle}
    >
      {following ? 'Following' : 'Follow'}
    </Button>
  )
}
