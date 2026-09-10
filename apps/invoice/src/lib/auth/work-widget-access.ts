import 'server-only'

import { getError } from '@876/core'

import { workErrorResponse } from '@/lib/api/work-response'
import { getFeatures } from '@/lib/features'

import {
  requireAnyApiPermission,
  requireApiPermission,
  type ApiContext,
} from './api-permission'

async function requireWorkWidgetEnabled(auth: ApiContext): Promise<ApiContext> {
  if (auth.response) return auth

  const features = await getFeatures({
    userId: auth.userId,
    organizationId: auth.orgId,
  })
  if (!features.widgets.enabledWidgetIds.includes('work'))
    return { response: workErrorResponse(getError('work/not-found')) }

  return auth
}

/** Applies Invoice permission and Work-widget rollout gates to route handlers. */
export async function requireWorkWidgetPermission(
  permission: string | readonly string[]
): Promise<ApiContext> {
  return requireWorkWidgetEnabled(await requireApiPermission(permission))
}

/** Applies an any-of Invoice permission check plus the Work-widget rollout gate. */
export async function requireAnyWorkWidgetPermission(
  permissions: readonly string[]
): Promise<ApiContext> {
  return requireWorkWidgetEnabled(await requireAnyApiPermission(permissions))
}
