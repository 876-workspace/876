import {
  handleGetWorkAlerts,
  handlePostWorkAlert,
} from '@/lib/api/work-alerts-route'

type Context = {
  params: Promise<{ invoiceId: string; taskId: string }>
}

export async function GET(_request: Request, routeContext: Context) {
  const { invoiceId, taskId } = await routeContext.params
  return handleGetWorkAlerts({ type: 'task', id: taskId }, invoiceId)
}

export async function POST(request: Request, routeContext: Context) {
  const { invoiceId, taskId } = await routeContext.params
  return handlePostWorkAlert(request, { type: 'task', id: taskId }, invoiceId)
}
