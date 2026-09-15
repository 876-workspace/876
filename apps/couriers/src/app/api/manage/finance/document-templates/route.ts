import 'server-only'

import {
  documentTemplateLayoutKeySchema,
  documentTemplateOverridesSchema,
  documentTemplateTypeSchema,
} from '@876/core/document-templates'
import { z } from 'zod'

import { createBillingIntegration } from '@/lib/services/billing'

import {
  invalidRequest,
  requireFinanceAccess,
  resultResponse,
} from '../_lib/access'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const listQuerySchema = z.strictObject({
  orgSlug: z.string().trim().min(1),
  documentType: documentTemplateTypeSchema.optional(),
})

const createBodySchema = z.strictObject({
  orgSlug: z.string().trim().min(1),
  documentType: documentTemplateTypeSchema,
  name: z.string().trim().min(1).max(80),
  layout: documentTemplateLayoutKeySchema,
  settings: documentTemplateOverridesSchema.optional(),
  isDefault: z.boolean().optional(),
})

/** Lists the caller's organization document templates, optionally by type. */
export async function GET(request: Request) {
  const query = listQuerySchema.safeParse(
    Object.fromEntries(new URL(request.url).searchParams)
  )
  if (!query.success) return invalidRequest('finance/invalid-document-template')

  const { orgSlug, documentType } = query.data
  const { context, response } = await requireFinanceAccess(orgSlug)
  if (response) return response
  if (!context) return invalidRequest('finance/invalid-document-template')

  const billing = createBillingIntegration()
  const result = await billing.documentTemplates.list(context.orgId, {
    ...(documentType ? { documentType } : {}),
  })

  return resultResponse('document-template', result, 200)
}

/** Creates a document template for the caller's organization. */
export async function POST(request: Request) {
  const body = createBodySchema.safeParse(
    await request.json().catch(() => null)
  )
  if (!body.success) return invalidRequest('finance/invalid-document-template')

  const { orgSlug, ...params } = body.data
  const { context, response } = await requireFinanceAccess(orgSlug)
  if (response) return response
  if (!context) return invalidRequest('finance/invalid-document-template')

  const billing = createBillingIntegration()
  const result = await billing.documentTemplates.create(context.orgId, params)

  return resultResponse('document-template', result, 201)
}
