import { apiSuccess } from '@876/core/api'

import { requireConsolePermission } from '@/lib/auth/route-guard'
import { reconcileBillingMirror } from '@/lib/billing/mirror'

export const runtime = 'nodejs'

export async function POST(): Promise<Response> {
  const { response } = await requireConsolePermission('console:organizations')
  if (response) return response

  return apiSuccess(await reconcileBillingMirror())
}
