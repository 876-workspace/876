import { handleRespondEventParticipant } from '@/lib/api/work-event-participants-route'

type Context = {
  params: Promise<{ eventId: string; participantId: string }>
}

export async function PATCH(request: Request, routeContext: Context) {
  const { eventId, participantId } = await routeContext.params
  return handleRespondEventParticipant(request, eventId, participantId)
}
