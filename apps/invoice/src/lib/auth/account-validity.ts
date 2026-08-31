import 'server-only'

import { cache } from 'react'

import { getPlatformClient } from '@/lib/services/platform'

/**
 * Whether the account behind a sealed session is still usable.
 *
 * A sealed session cookie only proves that someone signed in at some point —
 * it keeps verifying long after the account behind it was deleted, banned, or
 * suspended, because nothing in the cookie changes when the account does. So
 * the signature check alone is not an authorization answer.
 *
 * This lives apart from `guards.ts` because the same question has two callers
 * with different jobs: the layout guard, which *redirects*, and the context
 * resolver, which must *report* a status because it also serves routes outside
 * the app shell. Keeping one implementation is what stops those two from
 * drifting into disagreeing about whether a session is valid — which is exactly
 * how `/onboarding` ended up admitting an account the app shell would have
 * turned away.
 *
 * Deliberately fails **open**: only the two answers that positively establish
 * the account is unusable — it is gone, or it is disabled — return false. An
 * identity-API outage must not sign out every signed-in operator.
 *
 * Memoized per request, so the lookup costs one round trip no matter how many
 * callers ask.
 */
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
