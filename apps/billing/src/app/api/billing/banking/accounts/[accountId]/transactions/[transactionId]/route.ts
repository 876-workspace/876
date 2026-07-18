import {
  apiError,
  apiSuccess,
  Resource,
  TenantResource,
  requirePermission,
} from '@/lib/api/billing-route'
import { service } from '@/lib/service'
import { BankTransactionUpdateSchema } from '@/types/banking'

export const runtime = 'nodejs'

type Context = {
  params: Promise<{ accountId: string; transactionId: string }>
}

export async function GET(_request: Request, context: Context) {
  const access = await requirePermission('banking:read')
  if (access.response) return access.response

  const { accountId, transactionId } = await context.params
  const transaction = await service.bankTransactions.retrieve(
    access.context.tenant.id,
    accountId,
    transactionId
  )
  if (!transaction)
    return apiError('Bank transaction not found.', { status: 404 })

  return apiSuccess(TenantResource('bank_transaction', transaction))
}

export async function PATCH(request: Request, context: Context) {
  const access = await requirePermission('banking:write')
  if (access.response) return access.response

  const { accountId, transactionId } = await context.params
  const body = await request.json().catch(() => null)
  const parsed = BankTransactionUpdateSchema.safeParse(body)
  if (!parsed.success)
    return apiError('Enter valid bank transaction details.', { status: 422 })

  const result = await service.bankTransactions.update(
    access.context.tenant.id,
    accountId,
    transactionId,
    parsed.data
  )
  if (result.error !== null)
    return apiError(result.error, { status: result.status ?? 500 })

  return apiSuccess(Resource('bank_transaction', result.data))
}

export async function DELETE(_request: Request, context: Context) {
  const access = await requirePermission('banking:write')
  if (access.response) return access.response

  const { accountId, transactionId } = await context.params
  const result = await service.bankTransactions.delete(
    access.context.tenant.id,
    accountId,
    transactionId
  )
  if (result.error !== null)
    return apiError(result.error, { status: result.status ?? 500 })

  return apiSuccess({
    object: 'bank_transaction',
    id: transactionId,
    deleted: true,
  })
}
