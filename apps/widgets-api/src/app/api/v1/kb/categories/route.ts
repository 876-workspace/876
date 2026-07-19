import { apiError } from '@876/core/api'

import { requireWidgetsService } from '@/lib/auth/service-key'
import { serviceResponse } from '@/lib/http'
import { service } from '@/lib/service'
import { isKbHost } from '@/lib/service/kb'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  const auth = requireWidgetsService(request)
  if (auth.response) return auth.response

  const url = new URL(request.url)
  const host = url.searchParams.get('host') ?? ''
  if (!isKbHost(host))
    return apiError('Query param host is required and must be a valid host.', {
      status: 400,
      code: 'widgets/invalid-host',
    })

  const result = await service.kb.categories.listCategoriesForHost({
    actorUserId: auth.actorUserId,
    host,
  })
  return serviceResponse(result)
}
