import { handlePostWorkReminder } from '@/lib/api/work-reminders-route'

type Context = { params: Promise<{ invoiceId: string }> }

export async function POST(request: Request, routeContext: Context) {
  const { invoiceId } = await routeContext.params
  return handlePostWorkReminder(request, invoiceId)
}
