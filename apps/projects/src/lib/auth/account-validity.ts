import 'server-only'

import { cache } from 'react'

import { getPlatformClient } from '@/lib/services/platform'

export const isAccountUsable = cache(async function isAccountUsable(
  userId: string
): Promise<boolean> {
  const platform = await getPlatformClient()
  const { data, error } = await platform.users.retrieve({ id: userId })

  const accountGone = error?.code === 'user/not-found'
  const accountDisabled =
    data !== null &&
    data !== undefined &&
    ((data.status !== null && data.status !== 'active') || data.banned === true)

  return !accountGone && !accountDisabled
})
