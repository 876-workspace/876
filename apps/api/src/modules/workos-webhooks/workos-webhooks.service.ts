import { getLogger } from '@/platform/logger'
import * as users from '@/modules/users'

import type { WorkosWebhookEvent } from './workos-webhooks.schemas'

const log = getLogger('workos-webhooks')

function stringOrNull(value: unknown): string | null {
  return typeof value === 'string' ? value : null
}

/** Dispatches WorkOS events to the capability that owns the local state. */
export async function dispatch(
  event: WorkosWebhookEvent
): Promise<{ applied: boolean }> {
  if (event.event !== 'user.updated') {
    log.info({ event: event.event }, 'workos_webhooks.unhandled')
    return { applied: false }
  }

  const workosUserId = stringOrNull(event.data.id)
  if (!workosUserId) return { applied: false }

  return {
    applied: await users.syncUserFromWorkos({
      workosUserId,
      firstName: stringOrNull(event.data.first_name),
      lastName: stringOrNull(event.data.last_name),
      email: stringOrNull(event.data.email),
    }),
  }
}
