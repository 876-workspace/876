import {
  apiError,
  apiSuccess,
  Resource,
  TenantResource,
  requirePermission,
} from '@/lib/api/billing-route'
import { service } from '@/lib/service'
import { BankAccountUpdateSchema } from '@/types/banking'

export const runtime = 'nodejs'

type Context = { params: Promise<{ accountId: string }> }

export async function GET(_request: Request, context: Context) {
  const access = await requirePermission('banking:read')
  if (access.response) return access.response

  const { accountId } = await context.params
  const account = await service.bankAccounts.retrieve(
    access.context.tenant.id,
    accountId
  )
  if (!account) return apiError('Bank account not found.', { status: 404 })

  return apiSuccess(TenantResource('bank_account', account))
}

export async function PATCH(request: Request, context: Context) {
  const access = await requirePermission('banking:write')
  if (access.response) return access.response

  const { accountId } = await context.params
  const body = await request.json().catch(() => null)
  const parsed = BankAccountUpdateSchema.safeParse(body)
  if (!parsed.success)
    return apiError('Enter valid bank account details.', { status: 422 })

  const result = await service.bankAccounts.update(
    access.context.tenant.id,
    accountId,
    parsed.data
  )
  if (result.error !== null)
    return apiError(result.error, { status: result.status ?? 500 })

  return apiSuccess(Resource('bank_account', result.data))
}

export async function DELETE(_request: Request, context: Context) {
  const access = await requirePermission('banking:write')
  if (access.response) return access.response

  const { accountId } = await context.params
  const result = await service.bankAccounts.delete(
    access.context.tenant.id,
    accountId
  )
  if (result.error !== null)
    return apiError(result.error, { status: result.status ?? 500 })

  return apiSuccess({ object: 'bank_account', id: accountId, deleted: true })
}
