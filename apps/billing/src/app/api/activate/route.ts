import { apiError, apiSuccess } from '@876/core/api'

import { BILLING_APP_SLUG } from '@/lib/billing-app'
import { getContext } from '@/lib/auth/billing-context'
import { getPlatformClient } from '@/lib/876/platform-client'

export const runtime = 'nodejs'

export async function POST() {
  const context = await getContext()
  if (!context) {
    return apiError('Billing workspace access is required.', { status: 401 })
  }
  if (context.role === 'member') {
    return apiError('Insufficient Billing permissions.', { status: 403 })
  }
  if (context.accessStatus === 'blocked') {
    return apiError('Billing access is restricted.', { status: 403 })
  }
  if (context.accessStatus === 'active') {
    return apiSuccess({ alreadyActive: true })
  }

  const platform = await getPlatformClient()
  const result = await platform.orgs.subscriptions.provision(context.orgId, {
    appSlug: BILLING_APP_SLUG,
  })
  if (result.error) {
    return apiError('Unable to activate 876 Billing for this organization.', {
      status: 502,
    })
  }

  return apiSuccess(result.data, { status: 201 })
}
