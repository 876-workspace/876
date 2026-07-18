import {
  apiError,
  apiSuccess,
  requirePermission,
} from '@/lib/api/billing-route'
import { service } from '@/lib/service'

export const runtime = 'nodejs'

type Context = { params: Promise<{ creditNoteId: string }> }

export async function POST(_request: Request, context: Context) {
  const access = await requirePermission('sales:write')
  if (access.response) return access.response

  const { creditNoteId } = await context.params
  const result = await service.creditNotes.void(
    access.context.tenant.id,
    creditNoteId
  )
  if (result.error !== null)
    return apiError(result.error, { status: result.status ?? 500 })

  return apiSuccess({ object: 'credit_note', ...result.data })
}
