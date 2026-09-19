import { requireWidgetsService } from '@/lib/auth/service-key'
import { serviceResponse } from '@/lib/http'
import { records } from '@/lib/records'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  const auth = requireWidgetsService(request, { admin: true })
  if (auth.response) return auth.response

  const result = await records.stats.retrieveNotepadStats()
  return serviceResponse(result)
}
