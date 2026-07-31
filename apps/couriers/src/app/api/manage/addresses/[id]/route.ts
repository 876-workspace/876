import 'server-only'

import { apiJson } from '@876/core/api'
import type { NextRequest } from 'next/server'
import { z } from 'zod'

import { getManageContext } from '@/lib/auth/manage-context'
import { service } from '@/lib/service'
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
  if (ctx.role !== 'owner' && ctx.role !== 'admin')
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

  const result = await service.addresses.update(ctx.tenant.id, id, parsed.data)
  if (result.error)
    return apiJson(
      { error: result.error },
      { status: result.status, code: result.code }
    )

  return apiJson({ data: result.data })
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const { id } = await params
  const orgSlug = request.nextUrl.searchParams.get('orgSlug')
  if (!orgSlug) return apiJson({ error: 'Invalid address.' }, { status: 422 })

  const ctx = await getManageContext(orgSlug)
  if (!ctx) return apiJson({ error: 'Unauthorized.' }, { status: 401 })
  if (ctx.role !== 'owner' && ctx.role !== 'admin')
    return apiJson(
      { error: 'You do not have permission to manage locations.' },
      { status: 403, code: 'auth/forbidden' }
    )
  if (!ctx.tenant)
    return apiJson({ error: 'Tenant not found.' }, { status: 404 })

  const result = await service.addresses.delete(ctx.tenant.id, id)
  if (result.error)
    return apiJson(
      { error: result.error },
      { status: result.status, code: result.code }
    )

  return apiJson({ data: result.data })
}
