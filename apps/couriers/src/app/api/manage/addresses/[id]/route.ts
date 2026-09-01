import 'server-only'

import { apiJson } from '@876/core/api'
import type { NextRequest } from 'next/server'
import { z } from 'zod'

import { getManageContext } from '@/lib/auth/manage-context'
import {
  couriersErrorStatus,
  toAddressUpdateBody,
  toAddressView,
} from '@/lib/couriers'
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
    return apiJson({ error: 'Invalid address.' }, { status: 422 })
  }

  const envelope = envelopeSchema.safeParse(body)
  if (!envelope.success)
    return apiJson({ error: 'Invalid address.' }, { status: 422 })

  const ctx = await getManageContext(envelope.data.orgSlug)
  if (!ctx) return apiJson({ error: 'Unauthorized.' }, { status: 401 })
  if (ctx.role !== 'super_admin' && ctx.role !== 'admin')
    return apiJson(
      { error: 'You do not have permission to manage locations.' },
      { status: 403, code: 'auth/forbidden' }
    )
  if (!ctx.tenant)
    return apiJson({ error: 'Tenant not found.' }, { status: 404 })

  const rest = { ...(body as Record<string, unknown>) }
  delete rest.orgSlug
  const parsed = addressUpdateParamsSchema.safeParse(rest)
  if (!parsed.success)
    return apiJson(
      { error: parsed.error.issues[0]?.message ?? 'Invalid address.' },
      { status: 422 }
    )

  const $876 = await getCouriers()
  const result = await $876.addresses.update(
    id,
    toAddressUpdateBody(parsed.data)
  )
  if (result.error)
    return apiJson(
      { error: result.error.message },
      { status: couriersErrorStatus(result.error), code: result.error.code }
    )

  return apiJson({ data: toAddressView(result.data) })
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const { id } = await params
  const orgSlug = request.nextUrl.searchParams.get('orgSlug')
  if (!orgSlug) return apiJson({ error: 'Invalid address.' }, { status: 422 })

  const ctx = await getManageContext(orgSlug)
  if (!ctx) return apiJson({ error: 'Unauthorized.' }, { status: 401 })
  if (ctx.role !== 'super_admin' && ctx.role !== 'admin')
    return apiJson(
      { error: 'You do not have permission to manage locations.' },
      { status: 403, code: 'auth/forbidden' }
    )
  if (!ctx.tenant)
    return apiJson({ error: 'Tenant not found.' }, { status: 404 })

  const $876 = await getCouriers()
  const result = await $876.addresses.delete(id)
  if (result.error)
    return apiJson(
      { error: result.error.message },
      { status: couriersErrorStatus(result.error), code: result.error.code }
    )

  return apiJson({ data: { id: result.data.id, deleted: result.data.deleted } })
}
