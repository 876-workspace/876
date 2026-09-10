import { handleRespondTaskAssignment } from '@/lib/api/work-task-assignments-route'

type Context = {
  params: Promise<{ taskId: string; assignmentId: string }>
}

export async function PATCH(request: Request, routeContext: Context) {
  const { taskId, assignmentId } = await routeContext.params
  return handleRespondTaskAssignment(request, taskId, assignmentId)
}
