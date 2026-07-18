import {
  apiError,
  apiSuccess,
  Resource,
  requirePermission,
} from '@/lib/api/billing-route'
import { service } from '@/lib/service'
import { QuoteUpdateSchema } from '@/types/quote'

export const runtime = 'nodejs'

type Context = { params: Promise<{ quoteId: string }> }

export async function GET(request: Request, context: Context) {
  const access = await requirePermission('sales:read')
  if (access.response) return access.response

  const { quoteId } = await context.params
  const row = await service.quotes.retrieve(access.context.tenant.id, quoteId)
  if (!row) return apiError('Quote not found.', { status: 404 })

  return apiSuccess(
    Resource('quote', row as unknown as Record<string, unknown>)
  )
}

export async function PATCH(request: Request, context: Context) {
  const access = await requirePermission('sales:write')
  if (access.response) return access.response

  const { quoteId } = await context.params
  const body = await request.json().catch(() => null)
  const parsed = QuoteUpdateSchema.safeParse(body)
  if (!parsed.success)
    return apiError('Enter valid quote details.', { status: 422 })

  const result = await service.quotes.update(
    access.context.tenant.id,
    quoteId,
    parsed.data
  )
  if (result.error !== null)
    return apiError(result.error, { status: result.status ?? 500 })

  return apiSuccess(Resource('quote', result.data))
}

export async function DELETE(request: Request, context: Context) {
  const access = await requirePermission('sales:write')
  if (access.response) return access.response

  const { quoteId } = await context.params
  const result = await service.quotes.delete(access.context.tenant.id, quoteId)
  if (result.error !== null)
    return apiError(result.error, { status: result.status ?? 500 })

  return apiSuccess({ object: 'quote', id: quoteId, deleted: true })
}
