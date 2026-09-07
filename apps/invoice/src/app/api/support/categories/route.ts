import { getInvoiceContextResult } from '@/lib/auth/context'
import { getCrmSupport } from '@/lib/services/crm-support'

export async function GET() {
  const context = await getInvoiceContextResult()
  if (
    context.status !== 'ok' ||
    (context.context.accessStatus !== 'active' &&
      context.context.accessStatus !== 'trialing')
  )
    return Response.json(
      {
        data: null,
        error: { code: 'invoice/unauthorized', message: 'Unauthorized.' },
      },
      { status: 401 }
    )

  const result = await getCrmSupport().categories.list()
  return Response.json(result, {
    status: result.error
      ? result.error.code === 'crm/not-configured'
        ? 503
        : 502
      : 200,
  })
}
