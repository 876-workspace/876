import 'server-only'

import { apiError, getError } from '@876/core'

import { canAccess, resolveAccessContext } from './access-context'
import { getInvoiceApiContext } from './api-context'

export type ApiContext =
  | { response: Response; orgId?: undefined; userId?: undefined }
  | { response: null; orgId: string; userId: string }

function errorResponse(
  code: 'auth/no-session' | 'auth/forbidden' | 'error/unavailable'
) {
  const error = getError(code)
  return apiError(error, { status: error.httpStatus })
}

/** Authorizes an Invoice route handler without redirecting the browser. */
export async function requireApiPermission(
  permission: string | readonly string[]
): Promise<ApiContext> {
  const context = await getInvoiceApiContext()
  if (!context) return { response: errorResponse('auth/no-session') }

  const outcome = await resolveAccessContext(context.userId, context.orgId)
  if (outcome.status === 'unavailable')
    return { response: errorResponse('error/unavailable') }

  const permissions = typeof permission === 'string' ? [permission] : permission
  if (!permissions.every((item) => canAccess(outcome.context, item)))
    return { response: errorResponse('auth/forbidden') }

  return { response: null, orgId: context.orgId, userId: context.userId }
}
