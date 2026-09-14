import 'server-only'

import { apiJson } from '@876/core/api'
import type { NextRequest } from 'next/server'
import { z } from 'zod'

import { getManageContext } from '@/lib/auth/manage-context'
import { getFeatures } from '@/lib/features'
import { errorResponse } from '@/lib/errors'
import { createManagedCustomer } from '@/lib/manage/customers'
import { customerCreateParamsSchema } from '@/types/customer'

export const runtime = 'nodejs'
const envelopeSchema = z.object({ orgSlug: z.string().min(1) })

export async function POST(request: NextRequest) {
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
  if (ctx.role !== 'super-admin' && ctx.role !== 'admin')
    return errorResponse('auth/forbidden')
  if (!ctx.tenant) return errorResponse('tenant/not-found')
  const features = await getFeatures({
    userId: ctx.userId,
    organizationId: ctx.orgId,
  })
  if (!features.customerCreation)
    return errorResponse('customer/creation-paused')
  const params = { ...(body as Record<string, unknown>) }
  delete params.orgSlug
  const parsed = customerCreateParamsSchema.safeParse(params)
  if (!parsed.success) return errorResponse('customer/invalid')
  const result = await createManagedCustomer({
    tenant: ctx.tenant,
    params: parsed.data,
  })
  if (result.error) return errorResponse(result.code ?? 'error/unknown')
  return apiJson({ data: result.data }, { status: 201 })
}
