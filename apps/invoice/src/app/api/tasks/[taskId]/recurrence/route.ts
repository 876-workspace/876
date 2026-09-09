import {
  handleDeleteWorkRecurrence,
  handleGetWorkRecurrence,
  handlePatchWorkRecurrence,
} from '@/lib/api/work-recurrence-route'

type Context = { params: Promise<{ taskId: string }> }

export async function GET(_request: Request, routeContext: Context) {
  const { taskId } = await routeContext.params
  return handleGetWorkRecurrence({ type: 'task', id: taskId })
}

export async function PATCH(request: Request, routeContext: Context) {
  const { taskId } = await routeContext.params
  return handlePatchWorkRecurrence(request, { type: 'task', id: taskId })
}

export async function DELETE(_request: Request, routeContext: Context) {
  const { taskId } = await routeContext.params
  return handleDeleteWorkRecurrence({ type: 'task', id: taskId })
}
