import 'server-only'

import { apiJson } from '@876/core/api'
import type { NextRequest } from 'next/server'

import { requireApiAccess, type ApiContext } from '@/lib/auth/api-permission'
import { createIntegrationClientInputSchema } from '@/types/integrations'
import { integration } from '@/lib/services/integration'

export const runtime = 'nodejs'

function errorStatus(code: string): 400 | 404 {
  return code === 'projects/tenant-not-found' ||
    code === 'projects/integration-client-not-found'
    ? 404
    : 400
}

export async function GET() {
  const auth: ApiContext = await requireApiAccess({
    module: 'projects',
    permission: 'projects.view',
  })
  if (auth.response) return auth.response

  const result = await integration.listClients(auth.orgId)
  if (result.error || !result.data)
    return apiJson(
      {
        error:
          result.error?.message ?? 'Integration clients could not be loaded.',
      },
      { status: errorStatus(result.error?.code ?? '') }
    )

  return apiJson({ data: result.data })
}

export async function POST(request: NextRequest) {
  const auth: ApiContext = await requireApiAccess({
    module: 'projects',
    permission: 'projects.edit',
  })
  if (auth.response) return auth.response

  const body = await request.json().catch(() => null)
  const parsed = createIntegrationClientInputSchema.safeParse(body)
  if (!parsed.success)
    return apiJson(
      { error: 'Enter a valid client name and at least one scope.' },
      { status: 422 }
    )

  const result = await integration.createClient({
    organizationId: auth.orgId,
    name: parsed.data.name,
    scopes: [...parsed.data.scopes],
  })
  if (result.error || !result.data)
    return apiJson(
      { error: result.error?.message ?? 'The client could not be created.' },
      { status: errorStatus(result.error?.code ?? '') }
    )

  return apiJson({ data: result.data }, { status: 201 })
}
