import {
  apiError,
  apiSuccess,
  List,
  Resource,
  requirePermission,
} from '@/lib/api/billing-route'
import { service } from '@/lib/service'
import { BankTransactionCreateSchema } from '@/types/banking'

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

  const transactions = await service.bankTransactions.list(
    access.context.tenant.id,
    accountId
  )
  return apiSuccess(
    List(
      `/api/v1/banking/accounts/${encodeURIComponent(accountId)}/transactions`,
      transactions.map(
        ({ tenantId: _tenantId, ...transaction }) => transaction
      ),
      'bank_transaction'
    )
  )
}

export async function POST(request: Request, context: Context) {
  const access = await requirePermission('banking:write')
  if (access.response) return access.response

  const { accountId } = await context.params
  const body = await request.json().catch(() => null)
  const parsed = BankTransactionCreateSchema.safeParse(body)
  if (!parsed.success)
    return apiError('Enter valid bank transaction details.', { status: 422 })

  const result = await service.bankTransactions.create(
    access.context.tenant.id,
    accountId,
    parsed.data
  )
  if (result.error !== null)
    return apiError(result.error, { status: result.status ?? 500 })

  return apiSuccess(Resource('bank_transaction', result.data), {
    status: 201,
  })
}
