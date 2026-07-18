import { cache } from 'react'

import { service } from '@/lib/service'
import { $876 } from '@/lib/876'

/** The MC access grant for a given user ID, including their role and permissions. */
export const resolveMemberGrant = cache(async (userId: string) => {
  return service.team.retrieve(userId)
})

/** The 876 identity record for a given user ID; null on failure. */
export const resolveMemberIdentity = cache(async (userId: string) => {
  const result = await $876.users.retrieve(userId)
  return result.error ? null : result.data
})
