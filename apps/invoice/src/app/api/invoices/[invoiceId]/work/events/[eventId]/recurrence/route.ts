import {
  handleDeleteWorkRecurrence,
  handleGetWorkRecurrence,
  handlePatchWorkRecurrence,
} from '@/lib/api/work-recurrence-route'

type Context = { params: Promise<{ invoiceId: string; eventId: string }> }

export async function GET(_request: Request, routeContext: Context) {
  const { invoiceId, eventId } = await routeContext.params
  return handleGetWorkRecurrence({ type: 'event', id: eventId }, invoiceId)
}

export async function PATCH(request: Request, routeContext: Context) {
  const { invoiceId, eventId } = await routeContext.params
  return handlePatchWorkRecurrence(
    request,
    { type: 'event', id: eventId },
    invoiceId
  )
}

export async function DELETE(_request: Request, routeContext: Context) {
  const { invoiceId, eventId } = await routeContext.params
  return handleDeleteWorkRecurrence({ type: 'event', id: eventId }, invoiceId)
}
