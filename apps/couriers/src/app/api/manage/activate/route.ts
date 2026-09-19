import 'server-only'
import { apiJson } from '@876/core/api'

import { getPlatformClient } from '@/lib/clients/platform'
import { getManageContext } from '@/lib/auth/manage-context'
import { errorResponse } from '@/lib/errors'
import { COURIERS_APP_SLUG } from '@/lib/couriers-app'

export const runtime = 'nodejs'

export async function POST() {
  const ctx = await getManageContext()

  if (!ctx) {
    return errorResponse('auth/no-session')
  }

  if (ctx.role === 'staff') {
    return errorResponse('auth/forbidden')
  }

  if (ctx.accessStatus === 'blocked') {
    return errorResponse('auth/account-on-hold')
  }

  if (ctx.accessStatus === 'active') {
    return apiJson({ data: { already_active: true } })
  }

  const platform = await getPlatformClient()
  const result = await platform.subscriptions.create(ctx.orgId, {
    appSlug: COURIERS_APP_SLUG,
  })

  if (result.error) {
    return errorResponse('onboarding/activation-failed')
  }

  return apiJson({ data: result.data })
}
