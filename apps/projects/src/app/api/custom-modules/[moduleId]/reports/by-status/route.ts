import 'server-only'

import { apiJson } from '@876/core/api'
import type { NextRequest } from 'next/server'

import { requireApiAccess, type ApiContext } from '@/lib/auth/api-permission'
import { resolveCallerRoleKeys, serviceErrorStatus } from '@/lib/custom-modules/api-access'
import { moduleReportQuerySchema } from '@/lib/custom-modules/custom-module-inputs'
import { statusReportCsv } from '@/lib/custom-modules/record-form-helpers'
import { serviceWithRoleKeys } from '@/lib/custom-modules/service-with-roles'

export const runtime = 'nodejs'

type Props = { params: Promise<{ moduleId: string }> }

export async function GET(request: NextRequest, { params }: Props) {
  const auth: ApiContext = await requireApiAccess({
    module: 'projects',
    permission: 'projects.view',
  })
  if (auth.response) return auth.response

  const query = Object.fromEntries(new URL(request.url).searchParams.entries())
  const parsedQuery = moduleReportQuerySchema.safeParse(query)
  if (!parsedQuery.success)
    return apiJson({ error: 'Enter a valid report query.' }, { status: 422 })

  const { moduleId } = await params
  const decodedId = decodeURIComponent(moduleId)
  const roleKeys = await resolveCallerRoleKeys(auth.userId, auth.orgId)
  const result = await serviceWithRoleKeys(roleKeys).customModules.statusReport(
    auth.orgId,
    decodedId,
    { ...(parsedQuery.data.from !== undefined ? { from: parsedQuery.data.from } : {}) }
  )
  if (result.error || !result.data)
    return apiJson(
      { error: result.error?.message ?? 'The report could not be loaded.' },
      { status: serviceErrorStatus(result.error?.code ?? '') }
    )

  if (parsedQuery.data.format === 'csv') {
    return new Response(statusReportCsv(result.data), {
      headers: {
        'content-type': 'text/csv; charset=utf-8',
        'content-disposition': `attachment; filename="${result.data.moduleKey}-by-status.csv"`,
      },
    })
  }

  return apiJson({ data: result.data })
}
