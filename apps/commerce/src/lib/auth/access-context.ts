import 'server-only'

import type { AccessContext } from '@876/core/access'
import { cache } from 'react'

import { getAccount } from '@/lib/clients/account'

export type CommerceAccessContextOutcome =
  | { status: 'ok'; context: AccessContext }
  | { status: 'unavailable'; code: string }

/** Resolves the acting Commerce user's app assignment once per request. */
export const resolveCommerceAccessContext = cache(
  async function resolveCommerceAccessContext(
    userId: string,
    organizationId: string,
    appId: string
  ): Promise<CommerceAccessContextOutcome> {
    const account = await getAccount()
    const membership = await account.appMemberships.me.retrieve({
      organizationId,
      appId,
    })

    if (membership.error || !membership.data)
      return {
        status: 'unavailable',
        code: membership.error?.code ?? 'platform/unavailable',
      }

    const active =
      membership.data.status === 'active' &&
      membership.data.assigned &&
      membership.data.entitled &&
      membership.data.revoked_at === null

    return {
      status: 'ok',
      context: {
        subject: { userId },
        modules: active ? (membership.data.entitled_modules ?? []) : [],
        permissions: active ? membership.data.effective_permissions : [],
        features: [],
        experiments: {},
      },
    }
  }
)
