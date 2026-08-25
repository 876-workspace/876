import { apiJson } from '@876/core/api'
import type { NextRequest } from 'next/server'

import { getCrmBillingIntegration } from '@/lib/876/billing-integration'
import { getCrmApiContext } from '@/lib/auth/api-context'
import { createExternalCustomer } from '@/lib/finance/customers'
import { service } from '@/lib/service'
import { customerCreateSchema } from '@/lib/validation/customer'

export async function GET() {
  const context = await getCrmApiContext()
  if (!context) return apiJson({ error: 'Unauthorized.' }, { status: 401 })

  const profiles = await service.customers.list({ organizationId: context.orgId })
  if (profiles.length === 0) return apiJson({ data: [] })

  const finance = await getCrmBillingIntegration()
  const registry = await finance.customers.list(context.orgId, {
    ids: profiles.map((profile) => profile.billingCustomerId),
    limit: Math.min(profiles.length, 100),
  })
  if (registry.error)
    return apiJson({ error: registry.error.message }, { status: 502, code: registry.error.code })

  const byId = new Map(registry.data.data.map((customer) => [customer.id, customer]))
  return apiJson({
    data: profiles.map((profile) => ({ profile, customer: byId.get(profile.billingCustomerId) ?? null })),
  })
}

export async function POST(request: NextRequest) {
  const context = await getCrmApiContext()
  if (!context) return apiJson({ error: 'Unauthorized.' }, { status: 401 })

  const body = await request.json().catch(() => null)
  const parsed = customerCreateSchema.safeParse(body)
  if (!parsed.success)
    return apiJson({ error: parsed.error.issues[0]?.message ?? 'Invalid customer.' }, { status: 422 })

  const idempotencyKey = request.headers.get('x-idempotency-key')?.trim()
  if (!idempotencyKey)
    return apiJson({ error: 'Missing idempotency key.' }, { status: 400 })

  const finance = await getCrmBillingIntegration()
  const shared = await createExternalCustomer(finance, context.orgId, {
    idempotencyKey,
    ...parsed.data,
  })
  if (shared.error)
    return apiJson({ error: shared.error.message }, { status: 502, code: shared.error.code })

  const profile = await service.customers.create({
    organizationId: context.orgId,
    billingCustomerId: shared.data.id,
    ownerId: parsed.data.ownerId ?? null,
  })
  if (profile.error) {
    const status = profile.error.code === 'crm/customer-exists' ? 409 : 500
    return apiJson({ error: profile.error.message }, { status, code: profile.error.code })
  }

  return apiJson({ data: { profile: profile.data, customer: shared.data } }, { status: 201 })
}
