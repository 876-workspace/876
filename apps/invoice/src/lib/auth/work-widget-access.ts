import 'server-only'

import { getError } from '@876/core'

import { workErrorResponse } from '@/lib/api/work-response'
import { getFeatures } from '@/lib/features'

import { requireApiPermission, type ApiContext } from './api-permission'

/** Applies Invoice permission and Work-widget rollout gates to route handlers. */
export async function requireWorkWidgetPermission(
  permission: string
): Promise<ApiContext> {
  const auth = await requireApiPermission(permission)
  if (auth.response) return auth

  const features = await getFeatures({
    userId: auth.userId,
    organizationId: auth.orgId,
  })
  if (!features.widgets.enabledWidgetIds.includes('work'))
    return { response: workErrorResponse(getError('work/not-found')) }

  return auth
}
