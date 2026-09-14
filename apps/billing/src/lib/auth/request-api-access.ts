import 'server-only'

import { apiJson } from '@876/core/api'

import { getFeatures } from '@/lib/features'
import type { Permission } from '@/types/access'

import { getWorkspaceContext, hasPermission } from './billing-context'

export type RequestApiAccess =
  | { response: Response; context?: undefined }
  | {
      response: null
      context: NonNullable<Awaited<ReturnType<typeof getWorkspaceContext>>>
    }

function forbidden(): RequestApiAccess {
  return {
    response: apiJson(
      { data: null, error: { code: 'auth/forbidden', message: 'Forbidden.' } },
      { status: 403 }
    ),
  }
}

/**
 * Authorizes Billing Request route handlers at the same boundary as the page
 * surface: workspace permission plus the Billing Requests rollout/module gate.
 */
export async function requireRequestApiAccess(
  permission: Permission
): Promise<RequestApiAccess> {
  const context = await getWorkspaceContext()
  if (!context || !hasPermission(context, permission)) return forbidden()

  const features = await getFeatures({
    userId: context.userId,
    organizationId: context.orgId,
  })
  if (!features.productFeatures.requests) return forbidden()

  return { response: null, context }
}
