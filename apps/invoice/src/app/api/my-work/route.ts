import 'server-only'

import { apiSuccess, getError } from '@876/core'
import { z } from 'zod'

import { workErrorResponse } from '@/lib/api/work-response'
import { requireWorkWidgetPermission } from '@/lib/auth/work-widget-access'
import { getWork } from '@/lib/services/work'

export const runtime = 'nodejs'

const MAX_WINDOW_SECONDS = 62 * 24 * 60 * 60
const filterSchema = z
  .strictObject({
    from: z.coerce.number().int().nonnegative(),
    to: z.coerce.number().int().nonnegative(),
  })
  .refine(({ from, to }) => to >= from)
  .refine(({ from, to }) => to - from <= MAX_WINDOW_SECONDS)

export async function GET(request: Request) {
  const auth = await requireWorkWidgetPermission('my-work.view')
  if (auth.response) return auth.response

  const url = new URL(request.url)
  const parsed = filterSchema.safeParse({
    from: url.searchParams.get('from') ?? undefined,
    to: url.searchParams.get('to') ?? undefined,
  })
  if (!parsed.success)
    return workErrorResponse(getError('work/invalid-request'))

  const work = await getWork()
  const result = await work.myWork.retrieve(auth.orgId, parsed.data)
  if (result.error) return workErrorResponse(result.error)

  return apiSuccess(result.data)
}
