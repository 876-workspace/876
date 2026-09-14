import 'server-only'

import { apiJson } from '@876/core/api'

import { getManageContext } from '@/lib/auth/manage-context'
import { getAppError, getError } from '@/lib/errors'
import { billingIntegration } from '@/lib/services/billing'
import { getCouriers } from '@/lib/services/couriers'

export const runtime = 'nodejs'

const REGISTRY_LIMIT = 20

export async function GET(request: Request) {
  const orgSlug = new URL(request.url).searchParams.get('orgSlug')
  const q = new URL(request.url).searchParams.get('q')?.trim() ?? ''
  if (!orgSlug)
    return apiJson(
      { error: getAppError('error/validation-failed') },
      { status: getError('error/validation-failed').httpStatus }
    )

  const ctx = await getManageContext(orgSlug)
  if (!ctx) return apiJson({ error: 'Unauthorized.' }, { status: 401 })
  if (ctx.role !== 'super-admin' && ctx.role !== 'admin')
    return apiJson(
      { error: 'You do not have permission to manage customers.' },
      { status: 403, code: 'auth/forbidden' }
    )
  if (!ctx.tenant)
    return apiJson({ error: 'Tenant not found.' }, { status: 404 })
  if (!q) return apiJson({ data: [] })

  const registry = await billingIntegration.customers.list(ctx.orgId, {
    q,
    status: 'ACTIVE',
    limit: REGISTRY_LIMIT,
  })
  if (registry.error)
    return apiJson(
      { error: getAppError('customer/registry-unavailable') },
      { status: getError('customer/registry-unavailable').httpStatus }
    )
  const couriers = await getCouriers()
  const profiles = await couriers.customers.list({
    limit: REGISTRY_LIMIT,
    billing_customer_ids: registry.data.data
      .map((customer) => customer.id)
      .join(','),
  })
  if (profiles.error)
    return apiJson(
      { error: getAppError('customer/registry-unavailable') },
      { status: getError('customer/registry-unavailable').httpStatus }
    )
  const enrolled = new Set(
    profiles.data.data.map((profile) => profile.billing_customer_id)
  )
  return apiJson({
    data: registry.data.data.map((customer) => ({
      id: customer.id,
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      firstName: customer.firstName,
      lastName: customer.lastName,
      companyName: customer.companyName,
      customerKind: customer.customerKind,
      enrolled: enrolled.has(customer.id),
    })),
  })
}
