import {
  handleDeleteWorkAlert,
  handlePatchWorkAlert,
} from '@/lib/api/work-alerts-route'

type Context = {
  params: Promise<{ invoiceId: string; eventId: string; alertId: string }>
}

export async function PATCH(request: Request, routeContext: Context) {
  const { invoiceId, eventId, alertId } = await routeContext.params
  return handlePatchWorkAlert(
    request,
    { type: 'event', id: eventId },
    alertId,
    invoiceId
  )
}

export async function DELETE(_request: Request, routeContext: Context) {
  const { invoiceId, eventId, alertId } = await routeContext.params
  return handleDeleteWorkAlert(
    { type: 'event', id: eventId },
    alertId,
    invoiceId
  )
}
