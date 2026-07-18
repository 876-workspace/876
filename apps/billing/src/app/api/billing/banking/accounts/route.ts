import {
  apiError,
  apiSuccess,
  List,
  Resource,
  requirePermission,
} from '@/lib/api/billing-route'
import { service } from '@/lib/service'
import { BankAccountCreateSchema } from '@/types/banking'

export const runtime = 'nodejs'

export async function GET() {
  const access = await requirePermission('banking:read')
  if (access.response) return access.response

  const accounts = await service.bankAccounts.list(access.context.tenant.id)
  return apiSuccess(
    List(
      '/api/v1/banking/accounts',
      accounts.map(({ tenantId: _tenantId, ...account }) => account),
      'bank_account'
    )
  )
}

export async function POST(request: Request) {
  const access = await requirePermission('banking:write')
  if (access.response) return access.response

  const body = await request.json().catch(() => null)
  const parsed = BankAccountCreateSchema.safeParse(body)
  if (!parsed.success)
    return apiError('Enter valid bank account details.', { status: 422 })

  const result = await service.bankAccounts.create(
    access.context.tenant.id,
    parsed.data
  )
  if (result.error !== null)
    return apiError(result.error, { status: result.status ?? 500 })

  return apiSuccess(Resource('bank_account', result.data), { status: 201 })
}
