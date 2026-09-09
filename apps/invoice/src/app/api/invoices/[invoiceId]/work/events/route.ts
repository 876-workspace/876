import { handlePostWorkEvent } from '@/lib/api/work-events-route'

type Context = { params: Promise<{ invoiceId: string }> }

export async function POST(request: Request, routeContext: Context) {
  const { invoiceId } = await routeContext.params
  return handlePostWorkEvent(request, invoiceId)
}
