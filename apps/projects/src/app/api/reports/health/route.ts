import 'server-only'

import { apiJson } from '@876/core/api'
import { z } from 'zod'

import {
  csvDownload,
  searchParamsOf,
  serviceFailure,
} from '@/app/api/_lib/reporting-api'
import { reportFormatSchema } from '@/types/reporting'
import { requireApiAccess, type ApiContext } from '@/lib/auth/api-permission'
import { projects } from '@/lib/services/projects'

export const runtime = 'nodejs'

const healthQuerySchema = z.strictObject({
  format: reportFormatSchema.optional(),
})

export async function GET(request: Request) {
  const auth: ApiContext = await requireApiAccess({
    module: 'projects',
    permission: 'projects.view',
  })
  if (auth.response) return auth.response

  const parsed = healthQuerySchema.safeParse(searchParamsOf(request))
  if (!parsed.success)
    return apiJson({ error: 'Enter a valid report.' }, { status: 422 })

  if (parsed.data.format === 'csv') {
    const csv = await projects.reports.health(auth.orgId, { format: 'csv' })
    if (csv.error || csv.data === null)
      return serviceFailure(
        csv.error,
        'The health report could not be exported.'
      )
    return csvDownload(csv.data, 'health-report.csv')
  }

  const result = await projects.reports.health(auth.orgId)
  if (result.error || !result.data)
    return serviceFailure(
      result.error,
      'The health report could not be loaded.'
    )

  return apiJson({ data: result.data })
}
