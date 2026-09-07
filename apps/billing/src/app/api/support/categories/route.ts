import { apiError, apiJson } from '@876/core/api'
import { supportResponseStatus } from '@876/crm'

import { getWorkspaceContext } from '@/lib/auth/billing-context'
import { getCrmSupport } from '@/lib/services/crm-support'

export async function GET() {
  const context = await getWorkspaceContext()
  if (!context)
    return apiError(
      { code: 'billing/unauthorized', message: 'Unauthorized.' },
      { status: 401 }
    )

  const result = await getCrmSupport().categories.list()
  return apiJson(result, {
    status: supportResponseStatus(result.error?.code, 200),
  })
}
