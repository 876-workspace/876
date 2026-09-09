import {
  handleGetWorkAlerts,
  handlePostWorkAlert,
} from '@/lib/api/work-alerts-route'

type Context = { params: Promise<{ taskId: string }> }

export async function GET(_request: Request, routeContext: Context) {
  const { taskId } = await routeContext.params
  return handleGetWorkAlerts({ type: 'task', id: taskId })
}

export async function POST(request: Request, routeContext: Context) {
  const { taskId } = await routeContext.params
  return handlePostWorkAlert(request, { type: 'task', id: taskId })
}
