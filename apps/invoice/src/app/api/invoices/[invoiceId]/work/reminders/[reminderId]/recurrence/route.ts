import {
  handleDeleteWorkRecurrence,
  handleGetWorkRecurrence,
  handlePatchWorkRecurrence,
} from '@/lib/api/work-recurrence-route'

type Context = {
  params: Promise<{ invoiceId: string; reminderId: string }>
}

export async function GET(_request: Request, routeContext: Context) {
  const { invoiceId, reminderId } = await routeContext.params
  return handleGetWorkRecurrence(
    { type: 'reminder', id: reminderId },
    invoiceId
  )
}

export async function PATCH(request: Request, routeContext: Context) {
  const { invoiceId, reminderId } = await routeContext.params
  return handlePatchWorkRecurrence(
    request,
    { type: 'reminder', id: reminderId },
    invoiceId
  )
}

export async function DELETE(_request: Request, routeContext: Context) {
  const { invoiceId, reminderId } = await routeContext.params
  return handleDeleteWorkRecurrence(
    { type: 'reminder', id: reminderId },
    invoiceId
  )
}
