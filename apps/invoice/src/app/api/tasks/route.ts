import {
  handleGetWorkTasks,
  handlePostWorkTask,
} from '@/lib/api/work-tasks-route'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  return handleGetWorkTasks(request)
}

export async function POST(request: Request) {
  return handlePostWorkTask(request)
}
