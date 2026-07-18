import { requireWidgetsService } from '@/lib/auth/service-key'
import { serviceResponse } from '@/lib/http'
import { service } from '@/lib/service'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  const auth = requireWidgetsService(request, { admin: true })
  if (auth.response) return auth.response

  const url = new URL(request.url)
  const result = await service.notes.listAllNotes({
    ownerAccountId: url.searchParams.get('owner_account_id') ?? undefined,
    limit: Number(url.searchParams.get('limit') ?? '') || undefined,
    startingAfter: url.searchParams.get('starting_after') ?? undefined,
  })
  return serviceResponse(result)
}
