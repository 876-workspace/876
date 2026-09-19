import { apiError, apiJson } from '@876/core/api'
import { supportResponseStatus } from '@876/crm'

import { getCrmSupport } from '@/lib/clients/crm-support'
import { resolveSupportContext } from '../_lib/support-context'

export async function GET() {
  const context = await resolveSupportContext()
  if (!context)
    return apiError(
      { code: 'invoice/unauthorized', message: 'Unauthorized.' },
      { status: 401 }
    )

  const result = await getCrmSupport().categories.list()
  return apiJson(result, {
    status: supportResponseStatus(result.error?.code, 200),
  })
}
