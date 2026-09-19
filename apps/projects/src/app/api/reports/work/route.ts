import 'server-only'

import { apiJson } from '@876/core/api'
import { z } from 'zod'

import {
  csvDownload,
  searchParamsOf,
  serviceFailure,
} from '@/app/api/_lib/reporting-api'
import { reportFormatSchema, unixSecondsSchema } from '@/types/reporting'
import { requireApiAccess } from '@/lib/auth/api-permission'
import { projects } from '@/lib/clients/projects'
import type { ApiContext } from '@/types/access'

export const runtime = 'nodejs'

const workQuerySchema = z.strictObject({
  from: unixSecondsSchema,
  to: unixSecondsSchema,
  projectId: z.string().trim().min(1).optional(),
  format: reportFormatSchema.optional(),
})

export async function GET(request: Request) {
  const auth: ApiContext = await requireApiAccess({
    module: 'projects',
    permission: 'projects.view',
  })
  if (auth.response) return auth.response

  const parsed = workQuerySchema.safeParse(searchParamsOf(request))
  if (!parsed.success || parsed.data.to <= parsed.data.from)
    return apiJson({ error: 'Enter a valid report period.' }, { status: 422 })

  const { from, to, projectId, format } = parsed.data

  if (format === 'csv') {
    const csv = await projects.reports.work(auth.orgId, {
      from,
      to,
      projectId,
      format: 'csv',
    })
    if (csv.error || csv.data === null)
      return serviceFailure(csv.error, 'The work report could not be exported.')
    return csvDownload(csv.data, 'work-report.csv')
  }

  const result = await projects.reports.work(auth.orgId, {
    from,
    to,
    projectId,
  })
  if (result.error || !result.data)
    return serviceFailure(result.error, 'The work report could not be loaded.')

  return apiJson({ data: result.data })
}
