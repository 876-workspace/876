import { handleRespondTaskAssignment } from '@/lib/api/work-task-assignments-route'

type Context = {
  params: Promise<{
    invoiceId: string
    taskId: string
    assignmentId: string
  }>
}

export async function PATCH(request: Request, routeContext: Context) {
  const { invoiceId, taskId, assignmentId } = await routeContext.params
  return handleRespondTaskAssignment(
    request,
    taskId,
    assignmentId,
    invoiceId
  )
}
