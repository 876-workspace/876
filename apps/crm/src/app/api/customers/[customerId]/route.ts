import { apiJson } from '@876/core/api'
import type { NextRequest } from 'next/server'

import { getCrmApiContext } from '@/lib/auth/api-context'
import { service } from '@/lib/service'
import { customerDeleteSchema, customerUpdateSchema } from '@/lib/validation/customer'

type Context = { params: Promise<{ customerId: string }> }

export async function GET(_request: NextRequest, route: Context) {
  const context = await getCrmApiContext()
  if (!context) return apiJson({ error: 'Unauthorized.' }, { status: 401 })

  const { customerId } = await route.params
  const data = await service.customers.retrieve({ organizationId: context.orgId, id: customerId })
  if (!data) return apiJson({ error: 'Customer not found.' }, { status: 404 })
  return apiJson({ data })
}

export async function PATCH(request: NextRequest, route: Context) {
  const context = await getCrmApiContext()
  if (!context) return apiJson({ error: 'Unauthorized.' }, { status: 401 })

  const body = await request.json().catch(() => null)
  const parsed = customerUpdateSchema.safeParse(body)
  if (!parsed.success)
    return apiJson({ error: parsed.error.issues[0]?.message ?? 'Invalid customer.' }, { status: 422 })

  const { customerId } = await route.params
  const result = await service.customers.update(context.orgId, customerId, parsed.data)
  if (result.error)
    return apiJson({ error: result.error.message }, { status: result.error.code === 'crm/customer-not-found' ? 404 : 500, code: result.error.code })

  return apiJson({ data: result.data })
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
