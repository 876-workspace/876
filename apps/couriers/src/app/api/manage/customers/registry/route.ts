import 'server-only'

import { apiJson } from '@876/core/api'

import { getManageContext } from '@/lib/auth/manage-context'
import { errorResponse } from '@/lib/errors'
import { billingIntegration } from '@/lib/clients/billing'
import { getCouriers } from '@/lib/clients/couriers'

export const runtime = 'nodejs'

const REGISTRY_LIMIT = 20

export async function GET(request: Request) {
  const orgSlug = new URL(request.url).searchParams.get('orgSlug')
  const q = new URL(request.url).searchParams.get('q')?.trim() ?? ''
  if (!orgSlug) return errorResponse('error/validation-failed')

  const ctx = await getManageContext(orgSlug)
  if (!ctx) return errorResponse('auth/no-session')
  if (ctx.role !== 'super-admin' && ctx.role !== 'admin')
    return errorResponse('auth/forbidden')
  if (!ctx.tenant) return errorResponse('tenant/not-found')
  if (!q) return apiJson({ data: [] })

  const registry = await billingIntegration.customers.list(ctx.orgId, {
    q,
    status: 'ACTIVE',
    limit: REGISTRY_LIMIT,
  })
  if (registry.error) return errorResponse('customer/registry-unavailable')
  const couriers = await getCouriers()
  const profiles = await couriers.customers.list({
    limit: REGISTRY_LIMIT,
    billing_customer_ids: registry.data.data
      .map((customer) => customer.id)
      .join(','),
  })
  if (profiles.error) return errorResponse('customer/registry-unavailable')
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
