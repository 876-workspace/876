import {
  handleGetTaskAssignments,
  handlePostTaskAssignment,
} from '@/lib/api/work-task-assignments-route'

type Context = {
  params: Promise<{ invoiceId: string; taskId: string }>
}

export async function GET(_request: Request, routeContext: Context) {
  const { invoiceId, taskId } = await routeContext.params
  return handleGetTaskAssignments(taskId, invoiceId)
}

export async function POST(request: Request, routeContext: Context) {
  const { invoiceId, taskId } = await routeContext.params
  return handlePostTaskAssignment(request, taskId, invoiceId)
}
