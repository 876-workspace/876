import { handlePostWorkReminder } from '@/lib/api/work-reminders-route'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  return handlePostWorkReminder(request)
}
