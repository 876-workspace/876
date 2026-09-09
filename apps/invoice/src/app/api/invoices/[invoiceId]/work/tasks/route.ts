import {
  handleGetWorkTasks,
  handlePostWorkTask,
} from '@/lib/api/work-tasks-route'

type Context = { params: Promise<{ invoiceId: string }> }

export async function GET(request: Request, routeContext: Context) {
  const { invoiceId } = await routeContext.params
  return handleGetWorkTasks(request, invoiceId)
}

export async function POST(request: Request, routeContext: Context) {
  const { invoiceId } = await routeContext.params
  return handlePostWorkTask(request, invoiceId)
}
