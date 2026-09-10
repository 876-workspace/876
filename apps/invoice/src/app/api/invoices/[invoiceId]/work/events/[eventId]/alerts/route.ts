import {
  handleGetWorkAlerts,
  handlePostWorkAlert,
} from '@/lib/api/work-alerts-route'

type Context = {
  params: Promise<{ invoiceId: string; eventId: string }>
}

export async function GET(_request: Request, routeContext: Context) {
  const { invoiceId, eventId } = await routeContext.params
  return handleGetWorkAlerts({ type: 'event', id: eventId }, invoiceId)
}

export async function POST(request: Request, routeContext: Context) {
  const { invoiceId, eventId } = await routeContext.params
  return handlePostWorkAlert(request, { type: 'event', id: eventId }, invoiceId)
}
