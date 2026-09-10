import {
  handleGetWorkAlerts,
  handlePostWorkAlert,
} from '@/lib/api/work-alerts-route'

type Context = { params: Promise<{ eventId: string }> }

export async function GET(_request: Request, routeContext: Context) {
  const { eventId } = await routeContext.params
  return handleGetWorkAlerts({ type: 'event', id: eventId })
}

export async function POST(request: Request, routeContext: Context) {
  const { eventId } = await routeContext.params
  return handlePostWorkAlert(request, { type: 'event', id: eventId })
}
