import {
  handleDeleteEventParticipant,
  handlePatchEventParticipant,
} from '@/lib/api/work-event-participants-route'

type Context = {
  params: Promise<{ eventId: string; participantId: string }>
}

export async function PATCH(request: Request, routeContext: Context) {
  const { eventId, participantId } = await routeContext.params
  return handlePatchEventParticipant(request, eventId, participantId)
}

export async function DELETE(_request: Request, routeContext: Context) {
  const { eventId, participantId } = await routeContext.params
  return handleDeleteEventParticipant(eventId, participantId)
}
