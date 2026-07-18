import {
  apiError,
  apiSuccess,
  List,
  Resource,
  requirePermission,
} from '@/lib/api/billing-route'
import { service } from '@/lib/service'
import { SubscriptionCreateSchema } from '@/types/subscription'

export const runtime = 'nodejs'

export async function GET() {
  const access = await requirePermission('subscriptions:read')
  if (access.response) return access.response

  const subscriptions = await service.subscriptions.list(
    access.context.tenant.id
  )
  return apiSuccess(
    List(
      '/api/v1/subscriptions',
      subscriptions as unknown as Array<Record<string, unknown>>,
      'subscription'
    )
  )
}

export async function POST(request: Request) {
  const access = await requirePermission('subscriptions:write')
  if (access.response) return access.response

  const body = await request.json().catch(() => null)
  const parsed = SubscriptionCreateSchema.safeParse(body)
  if (!parsed.success)
    return apiError('Enter valid subscription details.', { status: 422 })

  const result = await service.subscriptions.create(access.context.tenant.id, {
    ...parsed.data,
    collectionMethod: hasOwn(body, 'collectionMethod')
      ? parsed.data.collectionMethod
      : undefined,
    billingTiming: hasOwn(body, 'billingTiming')
      ? parsed.data.billingTiming
      : undefined,
    prorationBehavior: hasOwn(body, 'prorationBehavior')
      ? parsed.data.prorationBehavior
      : undefined,
    autoApplyCredits: hasOwn(body, 'autoApplyCredits')
      ? parsed.data.autoApplyCredits
      : undefined,
  })
  if (result.error !== null)
    return apiError(result.error, { status: result.status ?? 500 })

  return apiSuccess(Resource('subscription', result.data), {
    status: 201,
  })
}

function hasOwn(value: unknown, key: string) {
  return (
    typeof value === 'object' && value !== null && Object.hasOwn(value, key)
  )
}
