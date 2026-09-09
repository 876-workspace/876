import {
  handleDeleteTaskAssignment,
  handlePatchTaskAssignment,
} from '@/lib/api/work-task-assignments-route'

type Context = {
  params: Promise<{
    invoiceId: string
    taskId: string
    assignmentId: string
  }>
}

export async function PATCH(request: Request, routeContext: Context) {
  const { invoiceId, taskId, assignmentId } = await routeContext.params
  return handlePatchTaskAssignment(
    request,
    taskId,
    assignmentId,
    invoiceId
  )
}

export async function DELETE(_request: Request, routeContext: Context) {
  const { invoiceId, taskId, assignmentId } = await routeContext.params
  return handleDeleteTaskAssignment(taskId, assignmentId, invoiceId)
}
