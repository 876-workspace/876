import {
  handleDeleteWorkAlert,
  handlePatchWorkAlert,
} from '@/lib/api/work-alerts-route'

type Context = { params: Promise<{ eventId: string; alertId: string }> }

export async function PATCH(request: Request, routeContext: Context) {
  const { eventId, alertId } = await routeContext.params
  return handlePatchWorkAlert(request, { type: 'event', id: eventId }, alertId)
}

export async function DELETE(_request: Request, routeContext: Context) {
  const { eventId, alertId } = await routeContext.params
  return handleDeleteWorkAlert({ type: 'event', id: eventId }, alertId)
}
