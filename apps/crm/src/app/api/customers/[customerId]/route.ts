import { apiJson } from '@876/core/api'
import type { NextRequest } from 'next/server'

import { getCrmBillingIntegration } from '@/lib/876/billing-integration'
import { getCrmApiContext } from '@/lib/auth/api-context'
import { updateExternalCustomer } from '@/lib/finance/customers'
import { service } from '@/lib/service'
import { customerDeleteSchema, customerUpdateSchema } from '@/lib/validation/customer'

type Context = { params: Promise<{ customerId: string }> }

async function resolveCustomer(organizationId: string, id: string) {
  const profile = await service.customers.retrieve({ organizationId, id })
  if (!profile) return null

  const finance = await getCrmBillingIntegration()
  const registry = await finance.customers.list(organizationId, {
    ids: [profile.billingCustomerId],
    limit: 1,
  })
  if (registry.error) return { profile, customer: null, registryError: registry.error }
  return { profile, customer: registry.data.data[0] ?? null, registryError: null }
}

export async function GET(_request: NextRequest, route: Context) {
  const context = await getCrmApiContext()
  if (!context) return apiJson({ error: 'Unauthorized.' }, { status: 401 })

  const { customerId } = await route.params
  const result = await resolveCustomer(context.orgId, customerId)
  if (!result) return apiJson({ error: 'Customer not found.' }, { status: 404 })
  if (result.registryError)
    return apiJson({ error: result.registryError.message }, { status: 502, code: result.registryError.code })

  return apiJson({ data: { profile: result.profile, customer: result.customer } })
}

export async function PATCH(request: NextRequest, route: Context) {
  const context = await getCrmApiContext()
  if (!context) return apiJson({ error: 'Unauthorized.' }, { status: 401 })

  const body = await request.json().catch(() => null)
  const parsed = customerUpdateSchema.safeParse(body)
  if (!parsed.success)
    return apiJson({ error: parsed.error.issues[0]?.message ?? 'Invalid customer.' }, { status: 422 })

  const { customerId } = await route.params
  const current = await resolveCustomer(context.orgId, customerId)
  if (!current) return apiJson({ error: 'Customer not found.' }, { status: 404 })
  if (current.registryError)
    return apiJson({ error: current.registryError.message }, { status: 502, code: current.registryError.code })

  let shared = current.customer
  if (shared?.customerType === 'EXTERNAL') {
    const finance = await getCrmBillingIntegration()
    const updated = await updateExternalCustomer(
      finance,
      context.orgId,
      current.profile.billingCustomerId,
      parsed.data
    )
    if (updated.error)
      return apiJson({ error: updated.error.message }, { status: 502, code: updated.error.code })
    shared = updated.data
  }

  const profile = await service.customers.update({
    organizationId: context.orgId,
    id: customerId,
    ownerId: parsed.data.ownerId ?? null,
    status: parsed.data.status,
  })
  if (profile.error)
    return apiJson({ error: profile.error.message }, { status: 404, code: profile.error.code })

  return apiJson({ data: { profile: profile.data, customer: shared } })
}

export async function DELETE(request: NextRequest, route: Context) {
  const context = await getCrmApiContext()
  if (!context) return apiJson({ error: 'Unauthorized.' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const parsed = customerDeleteSchema.safeParse(body)
  if (!parsed.success) return apiJson({ error: 'Invalid delete request.' }, { status: 422 })

  const { customerId } = await route.params
  const result = await service.customers.delete({
    organizationId: context.orgId,
    id: customerId,
    deletedBy: context.userId,
    reason: parsed.data.reason ?? null,
  })
  if (result.error)
    return apiJson({ error: result.error.message }, { status: 404, code: result.error.code })

  return apiJson({ data: result.data })
}
