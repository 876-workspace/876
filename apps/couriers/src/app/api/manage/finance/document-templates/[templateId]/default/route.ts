import 'server-only'

import { z } from 'zod'

import { createBillingIntegration } from '@/lib/services/billing'

import {
  invalidRequest,
  requireFinanceAccess,
  resultResponse,
} from '../../../_lib/access'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const setDefaultBodySchema = z.strictObject({
  orgSlug: z.string().trim().min(1),
})

type RouteContext = { params: Promise<{ templateId: string }> }

/** Promotes a document template to the default for its document type. */
export async function POST(request: Request, context: RouteContext) {
  const body = setDefaultBodySchema.safeParse(
    await request.json().catch(() => null)
  )
  if (!body.success) return invalidRequest('finance/invalid-document-template')

  const access = await requireFinanceAccess(body.data.orgSlug)
  if (access.response) return access.response
  if (!access.context)
    return invalidRequest('finance/invalid-document-template')

  const { templateId } = await context.params
  const billing = createBillingIntegration()
  const result = await billing.documentTemplates.setDefault(
    access.context.orgId,
    templateId
  )

  return resultResponse('document-template', result, 200)
}
