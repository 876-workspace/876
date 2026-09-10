import {
  handleDeleteWorkAlert,
  handlePatchWorkAlert,
} from '@/lib/api/work-alerts-route'

type Context = {
  params: Promise<{ invoiceId: string; taskId: string; alertId: string }>
}

export async function PATCH(request: Request, routeContext: Context) {
  const { invoiceId, taskId, alertId } = await routeContext.params
  return handlePatchWorkAlert(
    request,
    { type: 'task', id: taskId },
    alertId,
    invoiceId
  )
}

export async function DELETE(_request: Request, routeContext: Context) {
  const { invoiceId, taskId, alertId } = await routeContext.params
  return handleDeleteWorkAlert({ type: 'task', id: taskId }, alertId, invoiceId)
}
