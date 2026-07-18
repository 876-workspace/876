import {
  apiError,
  apiSuccess,
  List,
  Resource,
  requirePermission,
} from '@/lib/api/billing-route'
import { service } from '@/lib/service'
import { InvoiceCreateSchema } from '@/types/invoice'

export const runtime = 'nodejs'

export async function GET() {
  const access = await requirePermission('sales:read')
  if (access.response) return access.response

  const invoices = await service.invoices.list(access.context.tenant.id)
  return apiSuccess(
    List(
      '/api/v1/invoices',
      invoices as unknown as Array<Record<string, unknown>>,
      'invoice'
    )
  )
}

export async function POST(request: Request) {
  const access = await requirePermission('sales:write')
  if (access.response) return access.response

  const body = await request.json().catch(() => null)
  const parsed = InvoiceCreateSchema.safeParse(body)
  if (!parsed.success)
    return apiError('Enter valid invoice details.', { status: 422 })

  const result = await service.invoices.create(
    access.context.tenant.id,
    parsed.data
  )
  if (result.error !== null)
    return apiError(result.error, { status: result.status ?? 500 })

  return apiSuccess(Resource('invoice', result.data), { status: 201 })
}
