import {
  apiError,
  apiSuccess,
  List,
  Resource,
  requirePermission,
} from '@/lib/api/billing-route'
import { service } from '@/lib/service'
import { QuoteCreateSchema } from '@/types/quote'

export const runtime = 'nodejs'

export async function GET() {
  const access = await requirePermission('sales:read')
  if (access.response) return access.response

  const quotes = await service.quotes.list(access.context.tenant.id)
  return apiSuccess(
    List(
      '/api/v1/quotes',
      quotes as unknown as Array<Record<string, unknown>>,
      'quote'
    )
  )
}

export async function POST(request: Request) {
  const access = await requirePermission('sales:write')
  if (access.response) return access.response

  const body = await request.json().catch(() => null)
  const parsed = QuoteCreateSchema.safeParse(body)
  if (!parsed.success)
    return apiError('Enter valid quote details.', { status: 422 })

  const result = await service.quotes.create(
    access.context.tenant.id,
    parsed.data
  )
  if (result.error !== null)
    return apiError(result.error, { status: result.status ?? 500 })

  return apiSuccess(Resource('quote', result.data), { status: 201 })
}
