import { getCrmApiContext } from '@/lib/auth/api-context'
import { getCrmSupport } from '@/lib/services/crm-support'

export async function GET() {
  const context = await getCrmApiContext()
  if (!context)
    return Response.json(
      {
        data: null,
        error: { code: 'crm/unauthorized', message: 'Unauthorized.' },
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
