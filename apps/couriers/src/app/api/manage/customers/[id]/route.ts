import 'server-only'

import { apiJson } from '@876/core/api'
import type { NextRequest } from 'next/server'
import { z } from 'zod'

import { getManageContext } from '@/lib/auth/manage-context'
import { errorResponse } from '@/lib/errors'
import { getCouriers } from '@/lib/clients/couriers'
import { updateManagedCustomer } from '@/lib/manage/customers'
import { customerUpdateParamsSchema } from '@/types/customer'

export const runtime = 'nodejs'
type Context = { params: Promise<{ id: string }> }
const envelopeSchema = z.object({ orgSlug: z.string().min(1) })

function forbidden() {
  return errorResponse('auth/forbidden')
}

export async function PATCH(request: NextRequest, context: Context) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return errorResponse('customer/invalid')
  }
  const envelope = envelopeSchema.safeParse(body)
  if (!envelope.success) return errorResponse('customer/invalid')
  const ctx = await getManageContext(envelope.data.orgSlug)
  if (!ctx) return errorResponse('auth/no-session')
  if (ctx.role !== 'super-admin' && ctx.role !== 'admin') return forbidden()
  if (!ctx.tenant) return errorResponse('tenant/not-found')
  const rest = { ...(body as Record<string, unknown>) }
  delete rest.orgSlug
  const parsed = customerUpdateParamsSchema.safeParse(rest)
  if (!parsed.success) return errorResponse('customer/invalid')
  const { id } = await context.params
  const result = await updateManagedCustomer({
    tenant: ctx.tenant,
    id,
    params: parsed.data,
  })
  if (result.error) return errorResponse(result.code ?? 'error/unknown')
  return apiJson({ data: result.data })
}

export async function DELETE(request: NextRequest, context: Context) {
  const orgSlug = request.nextUrl.searchParams.get('orgSlug')
  if (!orgSlug) return errorResponse('settings/organization-required')
  const ctx = await getManageContext(orgSlug)
  if (!ctx) return errorResponse('auth/no-session')
  if (ctx.role !== 'super-admin' && ctx.role !== 'admin') return forbidden()
  if (!ctx.tenant) return errorResponse('tenant/not-found')
  const { id } = await context.params
  const $876 = await getCouriers()
  const result = await $876.customers.delete(id, {
    deleted_by: ctx.userId,
  })

  if (result.error) return errorResponse(result.error.code)
  return apiJson({ data: { id: result.data.id, deleted: true } })
}
