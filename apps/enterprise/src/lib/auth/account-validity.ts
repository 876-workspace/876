import 'server-only'

import { cache } from 'react'

import { getAccount } from '@/lib/clients/account-server'

/** Whether the account behind a sealed session is still usable. */
export const isAccountUsable = cache(async function isAccountUsable(
  userId: string
): Promise<boolean> {
  const account = await getAccount()
  const { data, error } = await account.users.retrieve()

  const accountGone = error?.code === 'user/not-found'
  const accountDisabled =
    data !== null &&
    data !== undefined &&
    ((data.status !== null && data.status !== 'active') || data.banned === true)

  return !accountGone && !accountDisabled
})
