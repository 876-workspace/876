import 'server-only'

import { apiJson } from '@876/core/api'
import type { NextRequest } from 'next/server'

import { requireApiAccess, type ApiContext } from '@/lib/auth/api-permission'
import { resolveCallerRoleKeys, serviceErrorStatus } from '@/lib/custom-modules/api-access'
import { moduleReportQuerySchema } from '@/lib/custom-modules/custom-module-inputs'
import { fieldReportCsv } from '@/lib/custom-modules/record-form-helpers'
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
  if (!parsedQuery.success || !parsedQuery.data.fieldKey)
    return apiJson({ error: 'Choose a field to report on.' }, { status: 422 })

  const { moduleId } = await params
  const decodedId = decodeURIComponent(moduleId)
  const roleKeys = await resolveCallerRoleKeys(auth.userId, auth.orgId)
  const result = await serviceWithRoleKeys(roleKeys).customModules.fieldReport(
    auth.orgId,
    decodedId,
    { fieldKey: parsedQuery.data.fieldKey }
  )
  if (result.error || !result.data)
    return apiJson(
      { error: result.error?.message ?? 'The report could not be loaded.' },
      { status: serviceErrorStatus(result.error?.code ?? '') }
    )

  if (parsedQuery.data.format === 'csv') {
    return new Response(fieldReportCsv(result.data), {
      headers: {
        'content-type': 'text/csv; charset=utf-8',
        'content-disposition': `attachment; filename="${result.data.moduleKey}-by-field.csv"`,
      },
    })
  }

  return apiJson({ data: result.data })
}
