import {
  apiError,
  apiSuccess,
  requirePermission,
} from '@/lib/api/billing-route'
import { service } from '@/lib/service'
import { CreditNoteApplySchema } from '@/types/credit-note'

export const runtime = 'nodejs'

type Context = { params: Promise<{ creditNoteId: string }> }

export async function POST(request: Request, context: Context) {
  const access = await requirePermission('sales:write')
  if (access.response) return access.response

  const { creditNoteId } = await context.params
  const body = await request.json().catch(() => null)
  const parsed = CreditNoteApplySchema.safeParse(body)
  if (!parsed.success)
    return apiError('Enter valid credit note application details.', {
      status: 422,
    })

  const result = await service.creditNotes.apply(
    access.context.tenant.id,
    creditNoteId,
    parsed.data
  )
  if (result.error !== null)
    return apiError(result.error, { status: result.status ?? 500 })

  return apiSuccess({ object: 'credit_note', ...result.data })
}
