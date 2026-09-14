import 'server-only'

import { apiJson } from '@876/core/api'
import { type NextRequest } from 'next/server'
import { z } from 'zod'

import { getManageContext } from '@/lib/auth/manage-context'
import { errorResponse } from '@/lib/errors'
import { toBranchUpdateBody, toBranchView } from '@/lib/couriers'
import { getCouriers } from '@/lib/services/couriers'
import { branchUpdateParamsSchema } from '@/types/branch'

export const runtime = 'nodejs'

type Params = { params: Promise<{ id: string }> }

const envelopeSchema = z.object({ orgSlug: z.string().min(1) })

export async function PATCH(request: NextRequest, { params }: Params) {
  const { id } = await params

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return errorResponse('branch/invalid')
  }

  const envelope = envelopeSchema.safeParse(body)
  if (!envelope.success) return errorResponse('branch/invalid')

  const ctx = await getManageContext(envelope.data.orgSlug)
  if (!ctx) return errorResponse('auth/no-session')
  if (ctx.role !== 'super-admin' && ctx.role !== 'admin')
    return errorResponse('auth/forbidden')
  if (!ctx.tenant) return errorResponse('tenant/not-found')

  const rest = { ...(body as Record<string, unknown>) }
  delete rest.orgSlug
  const parsed = branchUpdateParamsSchema.safeParse(rest)
  if (!parsed.success) return errorResponse('branch/invalid')

  const $876 = await getCouriers()
  const result = await $876.branches.update(id, toBranchUpdateBody(parsed.data))
  if (result.error) return errorResponse(result.error.code)

  const branch = toBranchView(result.data)

  return apiJson({ data: branch })
}
