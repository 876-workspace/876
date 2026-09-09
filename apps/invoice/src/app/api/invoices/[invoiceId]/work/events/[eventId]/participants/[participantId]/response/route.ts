import { handleRespondEventParticipant } from '@/lib/api/work-event-participants-route'

type Context = {
  params: Promise<{
    invoiceId: string
    eventId: string
    participantId: string
  }>
}

export async function PATCH(request: Request, routeContext: Context) {
  const { invoiceId, eventId, participantId } = await routeContext.params
  return handleRespondEventParticipant(
    request,
    eventId,
    participantId,
    invoiceId
  )
}
