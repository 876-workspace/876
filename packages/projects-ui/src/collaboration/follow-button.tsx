'use client'

import { Button } from '@876/ui/button'

type FollowButtonProps = {
  following: boolean
  action: string
}

export function FollowButton({ following, action }: FollowButtonProps) {
  return (
    <form action={action} method="post">
      <input type="hidden" name="following" value={String(!following)} />
      <Button type="submit" variant="outline" aria-pressed={following}>
        {following ? 'Following' : 'Follow'}
      </Button>
    </form>
  )
}
