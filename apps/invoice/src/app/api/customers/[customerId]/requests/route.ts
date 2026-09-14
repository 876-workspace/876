import { getError, toAppError } from '@876/core'
import { apiJson } from '@876/core/api'
import {
  requestStatusSchema,
  supportResponseStatus,
  type CreateRequestForBillingCustomerInput,
} from '@876/crm'
import { z } from 'zod'

import { requireApiCapability } from '@/lib/auth/api-permission'
import { INVOICE_REQUESTS_SLUG } from '@/lib/features'
import { getCrm } from '@/lib/services/crm'

const listQuerySchema = z.object({
  status: requestStatusSchema.optional(),
  relatedResourceType: z
    .enum(['invoice', 'payment', 'quote', 'credit-note'])
    .optional(),
  relatedResourceId: z.string().trim().min(1).max(160).optional(),
})
const createBodySchema = z.object({
  subject: z.string().trim().min(1).max(240),
  description: z.string().trim().max(20_000).nullable().optional(),
  priorityId: z.string().trim().max(160).optional(),
  categoryId: z.string().trim().max(160).nullable().optional(),
  relatedResourceType: z
    .enum(['invoice', 'payment', 'quote', 'credit-note'])
    .nullable()
    .optional(),
  relatedResourceId: z.string().trim().max(160).nullable().optional(),
  relatedResourceSnapshot: z
    .object({
      number: z.string().trim().max(160).optional(),
      amount: z.string().trim().max(160).optional(),
      currency: z.string().trim().max(16).optional(),
      status: z.string().trim().max(80).optional(),
    })
    .strict()
    .nullable()
    .optional(),
})

export const runtime = 'nodejs'

function invalidRequest() {
  const error = getError('crm/invalid-request')
  return apiJson(
    { data: null, error: toAppError(error) },
    { status: error.httpStatus }
  )
}

export async function GET(
  request: Request,
  context: RouteContext<'/api/customers/[customerId]/requests'>
) {
  const access = await requireApiCapability({
    permission: 'requests.view',
    feature: INVOICE_REQUESTS_SLUG,
  })
  if (access.response) return access.response

  const { customerId } = await context.params
  const query = listQuerySchema.safeParse(
    Object.fromEntries(new URL(request.url).searchParams)
  )
  if (!query.success) return invalidRequest()
  const result = await getCrm().requests.listForBillingCustomer(
    access.orgId,
    customerId,
    query.data
  )
  return apiJson(result, {
    status: supportResponseStatus(result.error?.code, 200),
  })
}

export async function POST(
  request: Request,
  context: RouteContext<'/api/customers/[customerId]/requests'>
) {
  const access = await requireApiCapability({
    permission: 'requests.create',
    feature: INVOICE_REQUESTS_SLUG,
  })
  if (access.response) return access.response

  const { customerId } = await context.params
  const body = createBodySchema.safeParse(
    await request.json().catch(() => null)
  )
  if (!body.success) return invalidRequest()
  const input: CreateRequestForBillingCustomerInput = {
    ...body.data,
    createdBy: access.userId,
  }
  const result = await getCrm().requests.createForBillingCustomer(
    access.orgId,
    customerId,
    input
  )
  return apiJson(result, {
    status: supportResponseStatus(result.error?.code, 201),
  })
}
