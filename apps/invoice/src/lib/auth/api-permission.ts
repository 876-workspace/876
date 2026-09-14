import 'server-only'

import { apiError, getError } from '@876/core'

import {
  canAccess,
  hasAccessFeature,
  resolveAccessContext,
} from './access-context'
import { getInvoiceApiContext } from './api-context'

export type ApiContext =
  | { response: Response; orgId?: undefined; userId?: undefined }
  | { response: null; orgId: string; userId: string }

type PermissionMode = 'all' | 'any'

function errorResponse(
  code: 'auth/no-session' | 'auth/forbidden' | 'error/unavailable'
) {
  const error = getError(code)
  return apiError(error, { status: error.httpStatus })
}

async function requirePermissions(
  permission: string | readonly string[],
  mode: PermissionMode,
  feature?: string
): Promise<ApiContext> {
  const context = await getInvoiceApiContext()
  if (!context) return { response: errorResponse('auth/no-session') }

  const outcome = await resolveAccessContext(context.userId, context.orgId)
  if (outcome.status === 'unavailable')
    return { response: errorResponse('error/unavailable') }

  const permissions = typeof permission === 'string' ? [permission] : permission
  const allowed =
    mode === 'all'
      ? permissions.every((item) => canAccess(outcome.context, item))
      : permissions.some((item) => canAccess(outcome.context, item))
  if (!allowed) return { response: errorResponse('auth/forbidden') }
  if (feature && !hasAccessFeature(outcome.context, feature))
    return { response: errorResponse('auth/forbidden') }

  return { response: null, orgId: context.orgId, userId: context.userId }
}

/** Authorizes an Invoice route handler without redirecting the browser. */
export function requireApiPermission(
  permission: string | readonly string[]
): Promise<ApiContext> {
  return requirePermissions(permission, 'all')
}

/** Authorizes permission plus an app feature at the API boundary. */
export function requireApiCapability(params: {
  permission: string | readonly string[]
  feature: string
}): Promise<ApiContext> {
  return requirePermissions(params.permission, 'all', params.feature)
}

/** Authorizes when at least one of the supplied Invoice permissions is granted. */
export function requireAnyApiPermission(
  permissions: readonly string[]
): Promise<ApiContext> {
  return requirePermissions(permissions, 'any')
}
