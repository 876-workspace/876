import 'server-only'

import { apiJson } from '@876/core/api'
import type { NextRequest } from 'next/server'
import { z } from 'zod'

import { getManageContext } from '@/lib/auth/manage-context'
import { errorResponse } from '@/lib/errors'
import { toAddressUpdateBody, toAddressView } from '@/lib/couriers'
import { getCouriers } from '@/lib/services/couriers'
import { addressUpdateParamsSchema } from '@/types/address'

export const runtime = 'nodejs'

type Params = { params: Promise<{ id: string }> }

const envelopeSchema = z.object({ orgSlug: z.string().min(1) })

export async function PATCH(request: NextRequest, { params }: Params) {
  const { id } = await params

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return errorResponse('address/invalid')
  }

  const envelope = envelopeSchema.safeParse(body)
  if (!envelope.success) return errorResponse('address/invalid')

  const ctx = await getManageContext(envelope.data.orgSlug)
  if (!ctx) return errorResponse('auth/no-session')
  if (ctx.role !== 'super-admin' && ctx.role !== 'admin')
    return errorResponse('auth/forbidden')
  if (!ctx.tenant) return errorResponse('tenant/not-found')

  const rest = { ...(body as Record<string, unknown>) }
  delete rest.orgSlug
  const parsed = addressUpdateParamsSchema.safeParse(rest)
  if (!parsed.success) return errorResponse('address/invalid')

  const $876 = await getCouriers()
  const result = await $876.addresses.update(
    id,
    toAddressUpdateBody(parsed.data)
  )
  if (result.error) return errorResponse(result.error.code)

  return apiJson({ data: toAddressView(result.data) })
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const { id } = await params
  const orgSlug = request.nextUrl.searchParams.get('orgSlug')
  if (!orgSlug) return errorResponse('address/invalid')

  const ctx = await getManageContext(orgSlug)
  if (!ctx) return errorResponse('auth/no-session')
  if (ctx.role !== 'super-admin' && ctx.role !== 'admin')
    return errorResponse('auth/forbidden')
  if (!ctx.tenant) return errorResponse('tenant/not-found')

  const $876 = await getCouriers()
  const result = await $876.addresses.delete(id)
  if (result.error) return errorResponse(result.error.code)

  return apiJson({ data: { id: result.data.id, deleted: result.data.deleted } })
}
