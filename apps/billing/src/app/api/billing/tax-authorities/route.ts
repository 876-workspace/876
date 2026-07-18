import {
  apiError,
  apiSuccess,
  List,
  Resource,
  requirePermission,
} from '@/lib/api/billing-route'
import { service } from '@/lib/service'
import { TaxAuthorityCreateSchema } from '@/types/tax'

export const runtime = 'nodejs'

export async function GET() {
  const access = await requirePermission('taxes:read')
  if (access.response) return access.response

  const authorities = await service.taxAuthorities.list(
    access.context.tenant.id
  )
  return apiSuccess(
    List(
      '/api/v1/tax-authorities',
      authorities as unknown as Array<Record<string, unknown>>,
      'tax_authority'
    )
  )
}

export async function POST(request: Request) {
  const access = await requirePermission('taxes:write')
  if (access.response) return access.response

  const body = await request.json().catch(() => null)
  const parsed = TaxAuthorityCreateSchema.safeParse(body)
  if (!parsed.success)
    return apiError('Enter valid tax authority details.', { status: 422 })

  const result = await service.taxAuthorities.create(
    access.context.tenant.id,
    parsed.data
  )
  if (result.error !== null)
    return apiError(result.error, { status: result.status ?? 500 })

  return apiSuccess(Resource('tax_authority', result.data), {
    status: 201,
  })
}
