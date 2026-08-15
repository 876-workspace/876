import { apiSuccess } from '@876/core/api'
import { create876BillingServerClient } from '@876/billing/server'

export const runtime = 'nodejs'

export async function GET(): Promise<Response> {
  try {
    const billing = create876BillingServerClient({
      baseUrl: process.env.BILLING_API_URL,
      public: true,
    })
    const result = await billing.request({ path: '/ready' })
    if (result.error) throw new Error(result.error.message)

    return apiSuccess({
      object: 'readiness',
      status: 'ready',
      service: 'billing',
    })
  } catch (error) {
    console.error('Billing API readiness probe failed', {
      name: error instanceof Error ? error.name : 'UnknownError',
      message:
        error instanceof Error ? error.message : 'Non-Error value thrown',
    })
    return apiSuccess(
      {
        object: 'readiness',
        status: 'not_ready',
        service: 'billing',
      },
      { status: 503 }
    )
  }
}
