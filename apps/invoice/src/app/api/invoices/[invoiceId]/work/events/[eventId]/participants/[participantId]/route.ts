import {
  handleDeleteEventParticipant,
  handlePatchEventParticipant,
} from '@/lib/api/work-event-participants-route'

type Context = {
  params: Promise<{
    invoiceId: string
    eventId: string
    participantId: string
  }>
}

export async function PATCH(request: Request, routeContext: Context) {
  const { invoiceId, eventId, participantId } = await routeContext.params
  return handlePatchEventParticipant(
    request,
    eventId,
    participantId,
    invoiceId
  )
}

export async function DELETE(_request: Request, routeContext: Context) {
  const { invoiceId, eventId, participantId } = await routeContext.params
  return handleDeleteEventParticipant(eventId, participantId, invoiceId)
}
