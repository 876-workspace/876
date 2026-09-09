import 'server-only'

import {
  apiError,
  apiSuccess,
  getError,
  isErrorCode,
  type AppError,
} from '@876/core'
import { z } from 'zod'

import {
  requireApiPermission,
  type ApiContext,
} from '@/lib/auth/api-permission'
import { getFeatures } from '@/lib/features'
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

function workErrorResponse(error: AppError) {
  const registered = isErrorCode(error.code)
    ? getError(error.code)
    : getError('work/invalid-response')
  return apiError(registered, { status: registered.httpStatus })
}

export async function GET(request: Request) {
  const auth: ApiContext = await requireApiPermission('my-work.view')
  if (auth.response) return auth.response

  const features = await getFeatures({
    userId: auth.userId,
    organizationId: auth.orgId,
  })
  if (!features.widgets.enabledWidgetIds.includes('work'))
    return workErrorResponse(getError('work/not-found'))

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
