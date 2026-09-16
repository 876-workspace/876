import 'server-only'

import { apiJson } from '@876/core/api'
import { z } from 'zod'

import {
  csvDownload,
  reportFormatSchema,
  searchParamsOf,
  serviceFailure,
  timeReportGroupSchema,
  unixSecondsSchema,
} from '@/app/api/_lib/reporting-api'
import { requireApiAccess, type ApiContext } from '@/lib/auth/api-permission'
import { projects } from '@/lib/services/projects'

export const runtime = 'nodejs'

const timeQuerySchema = z.strictObject({
  groupBy: timeReportGroupSchema.default('project'),
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

  const parsed = timeQuerySchema.safeParse(searchParamsOf(request))
  if (!parsed.success || parsed.data.to <= parsed.data.from)
    return apiJson({ error: 'Enter a valid report period.' }, { status: 422 })

  const { groupBy, from, to, projectId, format } = parsed.data

  if (format === 'csv') {
    const csv = await projects.reports.time(auth.orgId, {
      groupBy,
      from,
      to,
      projectId,
      format: 'csv',
    })
    if (csv.error || csv.data === null)
      return serviceFailure(csv.error, 'The time report could not be exported.')
    return csvDownload(csv.data, 'time-report.csv')
  }

  const result = await projects.reports.time(auth.orgId, {
    groupBy,
    from,
    to,
    projectId,
  })
  if (result.error || !result.data)
    return serviceFailure(result.error, 'The time report could not be loaded.')

  return apiJson({ data: result.data })
}
