import 'server-only'

import { apiJson } from '@876/core/api'
import type { NextRequest } from 'next/server'
import { z } from 'zod'

import { getManageContext } from '@/lib/auth/manage-context'
import { getFeatures } from '@/lib/features'
import { getAppError, getError } from '@/lib/errors'
import { createManagedCustomer } from '@/lib/manage/customers'
import { customerCreateParamsSchema } from '@/types/customer'

export const runtime = 'nodejs'
const envelopeSchema = z.object({ orgSlug: z.string().min(1) })

export async function POST(request: NextRequest) {
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
  if (ctx.role !== 'super-admin' && ctx.role !== 'admin')
    return apiJson(
      { error: 'You do not have permission to manage customers.' },
      { status: 403, code: 'auth/forbidden' }
    )
  if (!ctx.tenant)
    return apiJson({ error: 'Tenant not found.' }, { status: 404 })
  const features = await getFeatures({
    userId: ctx.userId,
    organizationId: ctx.orgId,
  })
  if (!features.customerCreation)
    return apiJson(
      { error: getAppError('customer/creation-paused') },
      { status: getError('customer/creation-paused').httpStatus }
    )
  const params = { ...(body as Record<string, unknown>) }
  delete params.orgSlug
  const parsed = customerCreateParamsSchema.safeParse(params)
  if (!parsed.success)
    return apiJson(
      { error: parsed.error.issues[0]?.message ?? 'Invalid customer.' },
      { status: 422 }
    )
  const result = await createManagedCustomer({
    tenant: ctx.tenant,
    params: parsed.data,
  })
  if (result.error)
    return apiJson(
      { error: result.error },
      { status: result.status, code: result.code }
    )
  return apiJson({ data: result.data }, { status: 201 })
}
