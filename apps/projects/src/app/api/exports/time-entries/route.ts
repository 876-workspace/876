import 'server-only'

import { apiJson } from '@876/core/api'
import type { NextRequest } from 'next/server'

import { csvDownload, searchParamsOf } from '@/app/api/_lib/reporting-api'
import { requireApiAccess } from '@/lib/auth/api-permission'
import { exportTimeEntriesQuerySchema } from '@/types/integrations'
import { integration } from '@/lib/clients/integration'
import type { ApiContext } from '@/types/access'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const auth: ApiContext = await requireApiAccess({
    module: 'projects',
    permission: 'projects.view',
  })
  if (auth.response) return auth.response

  const parsed = exportTimeEntriesQuerySchema.safeParse(searchParamsOf(request))
  if (!parsed.success)
    return apiJson({ error: 'Enter a valid export query.' }, { status: 422 })

  const result = await integration.exportTimeEntriesCsv(auth.orgId, parsed.data)
  if (result.error || result.data === null)
    return apiJson(
      { error: result.error?.message ?? 'Time entries could not be exported.' },
      { status: 400 }
    )

  return csvDownload(result.data, 'time-entries.csv')
}
