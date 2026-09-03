import 'server-only'

import { apiJson } from '@876/core/api'

import { canAccess, resolveAccessContext } from './access-context'
import { getProjectsApiContext } from './api-context'

export type ApiContext =
  | { response: Response; orgId?: undefined; userId?: undefined }
  | { response: null; orgId: string; userId: string }

/**
 * Authorizes a route handler before it touches the owning client.
 *
 * A route handler answers with a status, it never redirects: redirecting an API
 * authorization failure unmounts the app chrome and hides the real outcome from
 * the caller (`.claude/rules/access-control.md`). An outage is reported as 503
 * rather than 403, so a provider failure is not presented to the user as a
 * denial.
 */
export async function requireApiPermission(
  permission: string
): Promise<ApiContext> {
  const context = await getProjectsApiContext()
  if (!context)
    return {
      response: apiJson({ error: 'Unauthorized.' }, { status: 401 }),
    }

  const outcome = await resolveAccessContext(context.userId, context.orgId)
  if (outcome.status === 'unavailable')
    return {
      response: apiJson(
        { error: 'Access could not be verified. Try again shortly.' },
        { status: 503 }
      ),
    }

  if (!canAccess(outcome.context, permission))
    return {
      response: apiJson({ error: 'Forbidden.' }, { status: 403 }),
    }

  return { response: null, orgId: context.orgId, userId: context.userId }
}
