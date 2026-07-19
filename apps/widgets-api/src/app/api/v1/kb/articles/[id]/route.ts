import { requireWidgetsService } from '@/lib/auth/service-key'
import { serviceResponse } from '@/lib/http'
import { service } from '@/lib/service'
import { isKbHost } from '@/lib/service/kb'
import { err } from '@/lib/service/result'

export const runtime = 'nodejs'

type Ctx = { params: Promise<{ id: string }> }

export async function GET(request: Request, context: Ctx) {
  const auth = requireWidgetsService(request)
  if (auth.response) return auth.response

  const { id } = await context.params
  const url = new URL(request.url)
  const hostParam = url.searchParams.get('host')
  const host = hostParam && isKbHost(hostParam) ? hostParam : undefined
  const maxAudience =
    url.searchParams.get('max_audience') === 'platform_admin'
      ? 'platform_admin'
      : url.searchParams.get('max_audience') === 'end_user'
        ? 'end_user'
        : 'org_member'

  const result = await service.kb.articles.retrieveArticle({
    actorUserId: auth.actorUserId,
    id,
    host,
    maxAudience,
    isAdmin: false,
  })
  if (result.error) return serviceResponse(result)
  if (!result.data)
    return serviceResponse(
      err('Article not found.', 404, 'widgets/kb-article-not-found')
    )
  return serviceResponse(result)
}
