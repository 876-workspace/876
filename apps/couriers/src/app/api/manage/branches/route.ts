import 'server-only'

import { apiJson } from '@876/core/api'
import { type NextRequest } from 'next/server'
import { z } from 'zod'

import { getManageContext } from '@/lib/auth/manage-context'
import { errorResponse } from '@/lib/errors'
import { toBranchCreateBody, toBranchView } from '@/lib/couriers'
import { getCouriers } from '@/lib/services/couriers'
import { branchCreateParamsSchema } from '@/types/branch'

export const runtime = 'nodejs'

const createSchema = z.object({ orgSlug: z.string().min(1) })

export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return errorResponse('branch/invalid')
  }

  const envelope = createSchema.safeParse(body)
  if (!envelope.success) return errorResponse('branch/invalid')

  const ctx = await getManageContext(envelope.data.orgSlug)
  if (!ctx) return errorResponse('auth/no-session')
  if (ctx.role !== 'super-admin' && ctx.role !== 'admin')
    return errorResponse('auth/forbidden')
  if (!ctx.tenant) return errorResponse('tenant/not-found')

  const params = { ...(body as Record<string, unknown>) }
  delete params.orgSlug
  const parsed = branchCreateParamsSchema.safeParse(params)
  if (!parsed.success) return errorResponse('branch/invalid')

  const $876 = await getCouriers()
  const result = await $876.branches.create(toBranchCreateBody(parsed.data))
  if (result.error) return errorResponse(result.error.code)

  const branch = toBranchView(result.data)

  return apiJson({ data: branch }, { status: 201 })
}
