import {
  apiError,
  apiSuccess,
  List,
  Resource,
  requirePermission,
} from '@/lib/api/billing-route'
import { service } from '@/lib/service'
import { VendorCreateSchema } from '@/types/vendor'

export const runtime = 'nodejs'

export async function GET() {
  const access = await requirePermission('vendors:read')
  if (access.response) return access.response

  const vendors = await service.vendors.list(access.context.tenant.id)
  return apiSuccess(
    List(
      '/api/v1/vendors',
      vendors as unknown as Array<Record<string, unknown>>,
      'vendor'
    )
  )
}

export async function POST(request: Request) {
  const access = await requirePermission('vendors:write')
  if (access.response) return access.response

  const body = await request.json().catch(() => null)
  const parsed = VendorCreateSchema.safeParse(body)
  if (!parsed.success)
    return apiError('Enter valid vendor details.', { status: 422 })

  const result = await service.vendors.create(
    access.context.tenant.id,
    parsed.data
  )
  if (result.error !== null)
    return apiError(result.error, { status: result.status ?? 500 })

  return apiSuccess(Resource('vendor', result.data), { status: 201 })
}
