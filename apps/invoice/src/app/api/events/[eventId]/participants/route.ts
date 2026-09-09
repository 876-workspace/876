import {
  handleGetEventParticipants,
  handlePostEventParticipant,
} from '@/lib/api/work-event-participants-route'

type Context = { params: Promise<{ eventId: string }> }

export async function GET(_request: Request, routeContext: Context) {
  const { eventId } = await routeContext.params
  return handleGetEventParticipants(eventId)
}

export async function POST(request: Request, routeContext: Context) {
  const { eventId } = await routeContext.params
  return handlePostEventParticipant(request, eventId)
}
