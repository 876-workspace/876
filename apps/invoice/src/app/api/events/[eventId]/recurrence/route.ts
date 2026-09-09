import {
  handleDeleteWorkRecurrence,
  handleGetWorkRecurrence,
  handlePatchWorkRecurrence,
} from '@/lib/api/work-recurrence-route'

type Context = { params: Promise<{ eventId: string }> }

export async function GET(_request: Request, routeContext: Context) {
  const { eventId } = await routeContext.params
  return handleGetWorkRecurrence({ type: 'event', id: eventId })
}

export async function PATCH(request: Request, routeContext: Context) {
  const { eventId } = await routeContext.params
  return handlePatchWorkRecurrence(request, { type: 'event', id: eventId })
}

export async function DELETE(_request: Request, routeContext: Context) {
  const { eventId } = await routeContext.params
  return handleDeleteWorkRecurrence({ type: 'event', id: eventId })
}
