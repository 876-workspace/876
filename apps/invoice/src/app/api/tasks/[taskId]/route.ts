import { handlePatchWorkTask } from '@/lib/api/work-task-route'

export const runtime = 'nodejs'

type Context = { params: Promise<{ taskId: string }> }

export async function PATCH(request: Request, routeContext: Context) {
  const { taskId } = await routeContext.params
  return handlePatchWorkTask(request, taskId)
}
