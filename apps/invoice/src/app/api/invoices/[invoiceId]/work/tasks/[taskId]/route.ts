import { handlePatchWorkTask } from '@/lib/api/work-task-route'

type Context = { params: Promise<{ invoiceId: string; taskId: string }> }

export async function PATCH(request: Request, routeContext: Context) {
  const { invoiceId, taskId } = await routeContext.params
  return handlePatchWorkTask(request, taskId, invoiceId)
}
