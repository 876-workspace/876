import 'server-only'
import { apiJson } from '@876/core/api'

import { getPlatformClient } from '@/lib/876/platform-client'
import { getManageContext } from '@/lib/auth/manage-context'
import { COURIERS_APP_SLUG } from '@/lib/couriers-app'

export const runtime = 'nodejs'

export async function POST() {
  const ctx = await getManageContext()

  if (!ctx) {
    return apiJson({ error: 'Not authenticated' }, { status: 401 })
  }

  if (ctx.role === 'member') {
    return apiJson({ error: 'Insufficient permissions' }, { status: 403 })
  }

  if (ctx.accessStatus === 'blocked') {
    return apiJson({ error: 'Access is restricted' }, { status: 403 })
  }

  if (ctx.accessStatus === 'active') {
    return apiJson({ data: { already_active: true } })
  }

  const platform = await getPlatformClient()
  const result = await platform.orgs.subscriptions.provision(ctx.orgId, {
    appSlug: COURIERS_APP_SLUG,
  })

  if (result.error) {
    return apiJson({ error: 'Failed to activate workspace' }, { status: 500 })
  }

  return apiJson({ data: result.data })
}
