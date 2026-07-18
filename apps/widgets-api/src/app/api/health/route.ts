import { apiJson } from '@876/core/api'

export const runtime = 'nodejs'

export async function GET() {
  return apiJson({ data: { object: 'health', status: 'ok' }, error: null })
}
