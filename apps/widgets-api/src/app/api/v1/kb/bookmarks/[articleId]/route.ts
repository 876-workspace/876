import { requireWidgetsService } from '@/lib/auth/service-key'
import { serviceResponse } from '@/lib/http'
import { service } from '@/lib/service'

export const runtime = 'nodejs'

type Ctx = { params: Promise<{ articleId: string }> }

export async function DELETE(request: Request, context: Ctx) {
  const auth = requireWidgetsService(request)
  if (auth.response) return auth.response

  const { articleId } = await context.params
  const result = await service.kb.bookmarks.deleteBookmark({
    actorUserId: auth.actorUserId,
    articleId: decodeURIComponent(articleId),
  })
  return serviceResponse(result)
}
