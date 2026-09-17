import 'server-only'

import { apiJson } from '@876/core/api'
import type { NextRequest } from 'next/server'

import { requireApiAccess } from '@/lib/auth/api-permission'
import { projectsErrorStatus } from '@/app/api/_lib/error-status'
import { resolveCallerRoleKeys } from '@/lib/custom-modules/api-access'
import {
  createCustomRecordInputSchema,
  listCustomRecordsQuerySchema,
} from '@/types/custom-modules'
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
  const parsedQuery = listCustomRecordsQuerySchema.safeParse(query)
  if (!parsedQuery.success)
    return apiJson({ error: 'Enter a valid record query.' }, { status: 422 })

  const { moduleId } = await params
  const roleKeys = await resolveCallerRoleKeys(auth.userId, auth.orgId)
  const result = await serviceWithRoleKeys(roleKeys).customModules.listRecords(
    auth.orgId,
    decodeURIComponent(moduleId),
    parsedQuery.data
  )
  if (result.error || !result.data)
    return apiJson(
      { error: result.error?.message ?? 'Records could not be loaded.' },
      { status: projectsErrorStatus(result.error?.code ?? '') }
    )

  return apiJson({ data: result.data })
}

export async function POST(request: NextRequest, { params }: Props) {
  const auth: ApiContext = await requireApiAccess({
    module: 'projects',
    permission: 'projects.edit',
  })
  if (auth.response) return auth.response

  const body = await request.json().catch(() => null)
  const parsed = createCustomRecordInputSchema.safeParse(body)
  if (!parsed.success)
    return apiJson({ error: 'Enter a valid record.' }, { status: 422 })

  const { moduleId } = await params
  const roleKeys = await resolveCallerRoleKeys(auth.userId, auth.orgId)
  const result = await serviceWithRoleKeys(roleKeys).customModules.createRecord(
    auth.orgId,
    decodeURIComponent(moduleId),
    parsed.data
  )
  if (result.error || !result.data)
    return apiJson(
      { error: result.error?.message ?? 'The record could not be created.' },
      { status: projectsErrorStatus(result.error?.code ?? '') }
    )

  return apiJson({ data: result.data }, { status: 201 })
}
