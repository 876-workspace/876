import { handlePostWorkEvent } from '@/lib/api/work-events-route'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  return handlePostWorkEvent(request)
}
