import 'server-only'

import { apiJson } from '@876/core/api'
import type { NextRequest } from 'next/server'
import { z } from 'zod'

import { getManageContext } from '@/lib/auth/manage-context'
import { errorResponse } from '@/lib/errors'
import { toAddressCreateBody, toAddressView } from '@/lib/couriers'
import { getCouriers } from '@/lib/clients/couriers'
import { addressCreateParamsSchema } from '@/types/address'

export const runtime = 'nodejs'

const createSchema = z.object({ orgSlug: z.string().min(1) })

export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return errorResponse('address/invalid')
  }

  const envelope = createSchema.safeParse(body)
  if (!envelope.success) return errorResponse('address/invalid')

  const ctx = await getManageContext(envelope.data.orgSlug)
  if (!ctx) return errorResponse('auth/no-session')
  if (ctx.role !== 'super-admin' && ctx.role !== 'admin')
    return errorResponse('auth/forbidden')
  if (!ctx.tenant) return errorResponse('tenant/not-found')

  const params = { ...(body as Record<string, unknown>) }
  delete params.orgSlug
  const parsed = addressCreateParamsSchema.safeParse(params)
  if (!parsed.success) return errorResponse('address/invalid')

  const $876 = await getCouriers()
  const result = await $876.addresses.create(toAddressCreateBody(parsed.data))
  if (result.error) return errorResponse(result.error.code)

  return apiJson({ data: toAddressView(result.data) }, { status: 201 })
}
