import { apiError, apiSuccess } from '@/lib/api/billing-route'
import {
  integrationRoute,
  requireIntegrationOrganization,
} from '@/lib/api/integration-route'
import { BillingItemResource } from '@/lib/api/integration-resource'
import { service } from '@/lib/service'
import { ItemUpdateSchema } from '@/types/item'

export const runtime = 'nodejs'

type Context = {
  params: Promise<{ organizationId: string; itemId: string }>
}

export const GET = integrationRoute<Context>(async (request, context) => {
  const { organizationId, itemId } = await context.params
  const access = await requireIntegrationOrganization(
    request,
    organizationId,
    'billing.items.read'
  )
  if (access.response) return access.response

  const item = await service.items.retrieve(access.tenant.id, itemId)
  if (!item) return apiError('Item not found.', { status: 404 })
  return apiSuccess(BillingItemResource(item))
})

export const PATCH = integrationRoute<Context>(async (request, context) => {
  const { organizationId, itemId } = await context.params
  const access = await requireIntegrationOrganization(
    request,
    organizationId,
    'billing.items.write'
  )
  if (access.response) return access.response

  const body = await request.json().catch(() => null)
  const parsed = ItemUpdateSchema.safeParse(body)
  if (!parsed.success)
    return apiError('Enter valid item details.', { status: 422 })

  const result = await service.items.update(
    access.tenant.id,
    itemId,
    parsed.data
  )
  if (result.error !== null)
    return apiError(result.error, { status: result.status ?? 500 })

  const item = await service.items.retrieve(access.tenant.id, itemId)
  if (!item) return apiError('Item not found.', { status: 404 })
  return apiSuccess(BillingItemResource(item))
})

export const DELETE = integrationRoute<Context>(async (request, context) => {
  const { organizationId, itemId } = await context.params
  const access = await requireIntegrationOrganization(
    request,
    organizationId,
    'billing.items.write'
  )
  if (access.response) return access.response

  const result = await service.items.update(access.tenant.id, itemId, {
    isActive: false,
  })
  if (result.error !== null)
    return apiError(result.error, { status: result.status ?? 500 })

  return apiSuccess({ object: 'item', id: itemId, deleted: true })
})
