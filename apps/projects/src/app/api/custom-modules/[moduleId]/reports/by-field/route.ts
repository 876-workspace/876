import 'server-only'

import { apiJson } from '@876/core/api'
import type { NextRequest } from 'next/server'

import { requireApiAccess } from '@/lib/auth/api-permission'
import { projectsErrorStatus } from '@/app/api/_lib/error-status'
import { resolveCallerRoleKeys } from '@/lib/custom-modules/api-access'
import { moduleReportQuerySchema } from '@/types/custom-modules'
import { serviceWithRoleKeys } from '@/lib/custom-modules/service-with-roles'
import type { ApiContext } from '@/types/access'

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

  if (parsedQuery.data.format === 'csv') {
    const csv = await serviceWithRoleKeys(roleKeys).customModules.fieldReport(
      auth.orgId,
      decodedId,
      { fieldKey: parsedQuery.data.fieldKey, format: 'csv' }
    )
    if (csv.error || csv.data === null)
      return apiJson(
        { error: csv.error?.message ?? 'The report could not be exported.' },
        { status: projectsErrorStatus(csv.error?.code ?? '') }
      )
    return new Response(csv.data, {
      headers: {
        'content-type': 'text/csv; charset=utf-8',
        'content-disposition': `attachment; filename="${decodedId}-by-field.csv"`,
      },
    })
  }

  const result = await serviceWithRoleKeys(roleKeys).customModules.fieldReport(
    auth.orgId,
    decodedId,
    { fieldKey: parsedQuery.data.fieldKey }
  )
  if (result.error || !result.data)
    return apiJson(
      { error: result.error?.message ?? 'The report could not be loaded.' },
      { status: projectsErrorStatus(result.error?.code ?? '') }
    )

  return apiJson({ data: result.data })
}
