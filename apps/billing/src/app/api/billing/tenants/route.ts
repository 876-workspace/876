import { apiError, apiSuccess } from '@876/core/api'
import type { NextRequest } from 'next/server'

import { canManageBilling, getSetupContext } from '@/lib/auth/billing-context'
import { service } from '@/lib/service'
import { getPlatformClient } from '@/lib/876/platform-client'
import { BILLING_APP_SLUG } from '@/lib/billing-app'
import { TenantCreateSchema } from '@/types/tenant'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  const context = await getSetupContext()
  if (!context) {
    return apiError('Billing workspace access is required.', { status: 401 })
  }
  if (!canManageBilling(context.role)) {
    return apiError('Insufficient Billing permissions.', { status: 403 })
  }
  if (context.accessStatus !== 'active') {
    return apiError('Activate 876 Billing before creating its workspace.', {
      status: 409,
    })
  }
  const body = await request.json().catch(() => null)
  const parsed = TenantCreateSchema.safeParse(body)
  if (!parsed.success) {
    return apiError('Enter a valid workspace name and identifier.', {
      status: 422,
    })
  }

  const platform = await getPlatformClient()
  const claimed = await platform.provisioning.claimApplication(
    context.orgId,
    BILLING_APP_SLUG
  )
  if (claimed.error || !claimed.data) {
    return apiError(
      claimed.error?.message ??
        'The Billing provisioning run could not be claimed.',
      { status: 502 }
    )
  }

  let organizationCountryCode = context.tenant?.countryCode ?? null
  if (!context.tenant) {
    const organization = await platform.orgs.retrieve(context.orgId)
    organizationCountryCode = organization.data?.country_code ?? null
  }

  const result = await service.tenants.provision(
    context.orgId,
    context.userId,
    context.role,
    organizationCountryCode,
    parsed.data
  )
  if (result.error || !result.data) {
    const completed = await platform.provisioning.completeApplication(
      claimed.data.id,
      {
        status: 'failed',
        error: result.error ?? 'Failed to provision the Billing workspace.',
      }
    )
    if (completed.error)
      console.error(
        '[billing.provisioning.complete_failed_run]',
        completed.error
      )
    return apiError(
      result.error ?? 'Failed to provision the Billing workspace.',
      {
        status: result.status ?? 500,
      }
    )
  }

  const completed = await platform.provisioning.completeApplication(
    claimed.data.id,
    { status: 'succeeded' }
  )
  if (completed.error) {
    return apiError(
      'The Billing workspace was created but its provisioning run could not be completed.',
      {
        status: 502,
      }
    )
  }

  return apiSuccess(
    { object: 'billing_tenant', ...result.data },
    { status: result.data.created ? 201 : 200 }
  )
}
