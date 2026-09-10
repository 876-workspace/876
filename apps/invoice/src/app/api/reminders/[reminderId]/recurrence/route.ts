import {
  handleDeleteWorkRecurrence,
  handleGetWorkRecurrence,
  handlePatchWorkRecurrence,
} from '@/lib/api/work-recurrence-route'

type Context = { params: Promise<{ reminderId: string }> }

export async function GET(_request: Request, routeContext: Context) {
  const { reminderId } = await routeContext.params
  return handleGetWorkRecurrence({ type: 'reminder', id: reminderId })
}

export async function PATCH(request: Request, routeContext: Context) {
  const { reminderId } = await routeContext.params
  return handlePatchWorkRecurrence(request, {
    type: 'reminder',
    id: reminderId,
  })
}

export async function DELETE(_request: Request, routeContext: Context) {
  const { reminderId } = await routeContext.params
  return handleDeleteWorkRecurrence({ type: 'reminder', id: reminderId })
}
