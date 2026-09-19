import 'server-only'

import {
  documentTemplateLayoutKeySchema,
  documentTemplateOverridesSchema,
} from '@876/core/document-templates'
import { z } from 'zod'

import { createBillingIntegration } from '@/lib/clients/billing'

import {
  invalidRequest,
  requireFinanceAccess,
  resultResponse,
} from '../../_lib/access'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const updateBodySchema = z.strictObject({
  orgSlug: z.string().trim().min(1),
  name: z.string().trim().min(1).max(80).optional(),
  layout: documentTemplateLayoutKeySchema.optional(),
  settings: documentTemplateOverridesSchema.optional(),
})

const deleteBodySchema = z.strictObject({
  orgSlug: z.string().trim().min(1),
})

type RouteContext = { params: Promise<{ templateId: string }> }

/** Updates a document template's name, layout, or setting overrides. */
export async function PATCH(request: Request, context: RouteContext) {
  const body = updateBodySchema.safeParse(
    await request.json().catch(() => null)
  )
  if (!body.success) return invalidRequest('finance/invalid-document-template')

  const { orgSlug, ...params } = body.data
  const access = await requireFinanceAccess(orgSlug)
  if (access.response) return access.response
  if (!access.context)
    return invalidRequest('finance/invalid-document-template')

  const { templateId } = await context.params
  const billing = createBillingIntegration()
  const result = await billing.documentTemplates.update(
    access.context.orgId,
    templateId,
    params
  )

  return resultResponse('document-template', result, 200)
}

/** Deletes a document template. Billing rejects the default template. */
export async function DELETE(request: Request, context: RouteContext) {
  const body = deleteBodySchema.safeParse(
    await request.json().catch(() => null)
  )
  if (!body.success) return invalidRequest('finance/invalid-document-template')

  const access = await requireFinanceAccess(body.data.orgSlug)
  if (access.response) return access.response
  if (!access.context)
    return invalidRequest('finance/invalid-document-template')

  const { templateId } = await context.params
  const billing = createBillingIntegration()
  const result = await billing.documentTemplates.delete(
    access.context.orgId,
    templateId
  )

  return resultResponse('document-template', result, 200)
}
