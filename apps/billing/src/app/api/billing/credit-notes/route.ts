import {
  apiError,
  apiSuccess,
  List,
  requirePermission,
} from '@/lib/api/billing-route'
import { CreditNoteResource } from '@/lib/api/credit-note-resource'
import { service } from '@/lib/service'
import { CreditNoteCreateSchema } from '@/types/credit-note'

export const runtime = 'nodejs'

export async function GET() {
  const access = await requirePermission('sales:read')
  if (access.response) return access.response

  const rows = await service.creditNotes.list(access.context.tenant.id)
  return apiSuccess({
    ...List('/api/v1/credit-notes', [], 'credit_note'),
    data: rows.map(CreditNoteResource),
    total_count: rows.length,
  })
}

export async function POST(request: Request) {
  const access = await requirePermission('sales:write')
  if (access.response) return access.response

  const body = await request.json().catch(() => null)
  const parsed = CreditNoteCreateSchema.safeParse(body)
  if (!parsed.success)
    return apiError('Enter valid credit note details.', { status: 422 })

  const result = await service.creditNotes.create(
    access.context.tenant.id,
    parsed.data
  )
  if (result.error !== null)
    return apiError(result.error, { status: result.status ?? 500 })

  return apiSuccess({ object: 'credit_note', ...result.data }, { status: 201 })
}
