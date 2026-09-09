import {
  handleGetTaskAssignments,
  handlePostTaskAssignment,
} from '@/lib/api/work-task-assignments-route'

type Context = { params: Promise<{ taskId: string }> }

export async function GET(_request: Request, routeContext: Context) {
  const { taskId } = await routeContext.params
  return handleGetTaskAssignments(taskId)
}

export async function POST(request: Request, routeContext: Context) {
  const { taskId } = await routeContext.params
  return handlePostTaskAssignment(request, taskId)
}
