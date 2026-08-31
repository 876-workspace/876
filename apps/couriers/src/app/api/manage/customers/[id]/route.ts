import 'server-only'

import { apiJson } from '@876/core/api'
import type { NextRequest } from 'next/server'
import { z } from 'zod'

import { getManageContext } from '@/lib/auth/manage-context'
import { couriersErrorStatus } from '@/lib/couriers'
import { getCouriers } from '@/lib/services/couriers'
import { updateManagedCustomer } from '@/lib/manage/customers'
import { customerUpdateParamsSchema } from '@/types/customer'

export const runtime = 'nodejs'
type Context = { params: Promise<{ id: string }> }
const envelopeSchema = z.object({ orgSlug: z.string().min(1) })

function forbidden() {
  return apiJson(
    { error: 'You do not have permission to manage customers.' },
    { status: 403, code: 'auth/forbidden' }
  )
}

export async function PATCH(request: NextRequest, context: Context) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return apiJson({ error: 'Invalid customer.' }, { status: 422 })
  }
  const envelope = envelopeSchema.safeParse(body)
  if (!envelope.success)
    return apiJson({ error: 'Invalid customer.' }, { status: 422 })
  const ctx = await getManageContext(envelope.data.orgSlug)
  if (!ctx) return apiJson({ error: 'Unauthorized.' }, { status: 401 })
  if (ctx.role !== 'owner' && ctx.role !== 'admin') return forbidden()
  if (!ctx.tenant)
    return apiJson({ error: 'Tenant not found.' }, { status: 404 })
  const rest = { ...(body as Record<string, unknown>) }
  delete rest.orgSlug
  const parsed = customerUpdateParamsSchema.safeParse(rest)
  if (!parsed.success)
    return apiJson(
      { error: parsed.error.issues[0]?.message ?? 'Invalid customer.' },
      { status: 422 }
    )
  const { id } = await context.params
  const result = await updateManagedCustomer({
    tenant: ctx.tenant,
    id,
    params: parsed.data,
  })
  if (result.error)
    return apiJson(
      { error: result.error },
      { status: result.status, code: result.code }
    )
  return apiJson({ data: result.data })
}

export async function DELETE(request: NextRequest, context: Context) {
  const orgSlug = request.nextUrl.searchParams.get('orgSlug')
  if (!orgSlug)
    return apiJson({ error: 'Organization is required.' }, { status: 422 })
  const ctx = await getManageContext(orgSlug)
  if (!ctx) return apiJson({ error: 'Unauthorized.' }, { status: 401 })
  if (ctx.role !== 'owner' && ctx.role !== 'admin') return forbidden()
  if (!ctx.tenant)
    return apiJson({ error: 'Tenant not found.' }, { status: 404 })
  const { id } = await context.params
  const $876 = await getCouriers()
  const result = await $876.customers.delete(id, {
    deleted_by: ctx.userId,
  })

  if (result.error)
    return apiJson(
      { error: result.error.message },
      { status: couriersErrorStatus(result.error), code: result.error.code }
    )
  return apiJson({ data: { id: result.data.id, deleted: true } })
}
