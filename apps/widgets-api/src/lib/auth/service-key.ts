import { createHash, timingSafeEqual } from 'node:crypto'

import { apiError } from '@876/core/api'

export type ServiceAuth =
  | {
      actorUserId: string
      isAdmin: boolean
      response: null
    }
  | { actorUserId: null; isAdmin: false; response: Response }

function matchesKey(presented: string, expected: string) {
  const a = createHash('sha256').update(presented).digest()
  const b = createHash('sha256').update(expected).digest()
  return timingSafeEqual(a, b)
}

/**
 * Authorizes server-to-server calls from Console/Billing.
 * Requires x-internal-key === WIDGETS_SERVICE_KEY and x-876-actor-user-id.
 * Admin routes also require x-876-widget-role: admin.
 */
export function requireWidgetsService(
  request: Request,
  options: { admin?: boolean } = {}
): ServiceAuth {
  const expected = process.env.WIDGETS_SERVICE_KEY
  if (!expected)
    return {
      actorUserId: null,
      isAdmin: false,
      response: apiError('Widgets API is not configured.', { status: 503 }),
    }

  const presented = request.headers.get('x-internal-key')
  if (!presented || !matchesKey(presented, expected))
    return {
      actorUserId: null,
      isAdmin: false,
      response: apiError('Unauthorized.', { status: 401 }),
    }

  const actorUserId = request.headers.get('x-876-actor-user-id')?.trim()
  if (!actorUserId)
    return {
      actorUserId: null,
      isAdmin: false,
      response: apiError('Missing actor identity.', { status: 400 }),
    }

  const role = request.headers.get('x-876-widget-role')
  const isAdmin = role === 'admin'
  if (options.admin && !isAdmin)
    return {
      actorUserId: null,
      isAdmin: false,
      response: apiError('Widget administrator access is required.', {
        status: 403,
      }),
    }

  return { actorUserId, isAdmin, response: null }
}
