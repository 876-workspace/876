import {
  apiError,
  apiSuccess,
  Resource,
  requirePermission,
} from '@/lib/api/billing-route'
import { service } from '@/lib/service'
import { TaxAuthorityUpdateSchema } from '@/types/tax'

export const runtime = 'nodejs'

type Context = { params: Promise<{ taxAuthorityId: string }> }

export async function PATCH(request: Request, context: Context) {
  const access = await requirePermission('taxes:write')
  if (access.response) return access.response

  const { taxAuthorityId } = await context.params
  const body = await request.json().catch(() => null)
  const parsed = TaxAuthorityUpdateSchema.safeParse(body)
  if (!parsed.success)
    return apiError('Enter valid tax authority details.', { status: 422 })

  const result = await service.taxAuthorities.update(
    access.context.tenant.id,
    taxAuthorityId,
    parsed.data
  )
  if (result.error !== null)
    return apiError(result.error, { status: result.status ?? 500 })

  return apiSuccess(Resource('tax_authority', result.data))
}
