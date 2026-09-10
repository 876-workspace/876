import {
  handleGetEventParticipants,
  handlePostEventParticipant,
} from '@/lib/api/work-event-participants-route'

type Context = {
  params: Promise<{ invoiceId: string; eventId: string }>
}

export async function GET(_request: Request, routeContext: Context) {
  const { invoiceId, eventId } = await routeContext.params
  return handleGetEventParticipants(eventId, invoiceId)
}

export async function POST(request: Request, routeContext: Context) {
  const { invoiceId, eventId } = await routeContext.params
  return handlePostEventParticipant(request, eventId, invoiceId)
}
