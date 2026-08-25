import { apiJson } from '@876/core/api'
import type { NextRequest } from 'next/server'

import { getCrmApiContext } from '@/lib/auth/api-context'
import { service } from '@/lib/service'
import { customerCreateSchema } from '@/lib/validation/customer'

export async function GET() {
  const context = await getCrmApiContext()
  if (!context) return apiJson({ error: 'Unauthorized.' }, { status: 401 })

  const data = await service.customers.list({ organizationId: context.orgId })
  return apiJson({ data })
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

  const result = await service.customers.create(context.orgId, {
    idempotencyKey,
    ...parsed.data,
  })
  if (result.error) {
    const status = result.error.code === 'crm/customer-exists' ? 409 : 500
    return apiJson({ error: result.error.message }, { status, code: result.error.code })
  }

  return apiJson({ data: result.data }, { status: 201 })
}
