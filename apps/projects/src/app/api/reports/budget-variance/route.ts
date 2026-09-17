import 'server-only'

import { apiJson } from '@876/core/api'
import { z } from 'zod'

import {
  csvDownload,
  searchParamsOf,
  serviceFailure,
} from '@/app/api/_lib/reporting-api'
import { reportFormatSchema, unixSecondsSchema } from '@/types/reporting'
import { requireApiAccess, type ApiContext } from '@/lib/auth/api-permission'
import { projects } from '@/lib/services/projects'

export const runtime = 'nodejs'

const budgetVarianceQuerySchema = z.strictObject({
  from: unixSecondsSchema,
  to: unixSecondsSchema,
  format: reportFormatSchema.optional(),
})

export async function GET(request: Request) {
  const auth: ApiContext = await requireApiAccess({
    module: 'projects',
    permission: 'projects.view',
  })
  if (auth.response) return auth.response

  const parsed = budgetVarianceQuerySchema.safeParse(searchParamsOf(request))
  if (!parsed.success || parsed.data.to <= parsed.data.from)
    return apiJson({ error: 'Enter a valid report period.' }, { status: 422 })

  const { from, to, format } = parsed.data

  if (format === 'csv') {
    const csv = await projects.reports.budgetVariance(auth.orgId, {
      from,
      to,
      format: 'csv',
    })
    if (csv.error || csv.data === null)
      return serviceFailure(
        csv.error,
        'The budget variance report could not be exported.'
      )
    return csvDownload(csv.data, 'budget-variance-report.csv')
  }

  const result = await projects.reports.budgetVariance(auth.orgId, { from, to })
  if (result.error || !result.data)
    return serviceFailure(
      result.error,
      'The budget variance report could not be loaded.'
    )

  return apiJson({ data: result.data })
}
