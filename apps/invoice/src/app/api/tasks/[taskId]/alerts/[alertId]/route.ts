import {
  handleDeleteWorkAlert,
  handlePatchWorkAlert,
} from '@/lib/api/work-alerts-route'

type Context = { params: Promise<{ taskId: string; alertId: string }> }

export async function PATCH(request: Request, routeContext: Context) {
  const { taskId, alertId } = await routeContext.params
  return handlePatchWorkAlert(request, { type: 'task', id: taskId }, alertId)
}

export async function DELETE(_request: Request, routeContext: Context) {
  const { taskId, alertId } = await routeContext.params
  return handleDeleteWorkAlert({ type: 'task', id: taskId }, alertId)
}
