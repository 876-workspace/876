import { apiError, apiSuccess } from '@876/core/api'
import type {
  AccountingConnectionMode,
  AccountingProviderEnvironment,
} from '@876/billing/operator'

import {
  canManageBilling,
  getContext,
} from '@/lib/auth/billing-context'
import { getAccountingProviderClient } from '@/lib/services/accounting-providers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type RouteContext = {
  params: Promise<{ path?: string[] }>
}

type CreateBody = {
  providerId?: unknown
  name?: unknown
  environment?: unknown
  mode?: unknown
}

async function requireAccountingProviderManager() {
  const context = await getContext()
  if (!context)
    return {
      response: apiError('Billing authentication is required.', {
        status: 401,
      }),
      context: null,
    }

  if (!context.permissions.includes('settings:read'))
    return {
      response: apiError(
        'You do not have permission to manage accounting providers.',
        { status: 403 }
      ),
      context: null,
    }

  if (!canManageBilling(context.role))
    return {
      response: apiError(
        'Only organization owners and administrators can manage accounting providers.',
        { status: 403 }
      ),
      context: null,
    }

  return { response: null, context }
}

function providerError(
  result: { error: { code: string; message: string } | null },
  fallback: string
) {
  return apiError(result.error ?? fallback, { status: 400 })
}

function connectionAction(path: string[]) {
  if (path.length < 2 || path[0] !== 'connections') return null
  return {
    connectionId: path[1] ?? '',
    action: path[2] ?? null,
  }
}

export async function POST(
  request: Request,
  routeContext: RouteContext
): Promise<Response> {
  const gate = await requireAccountingProviderManager()
  if (gate.response || !gate.context) return gate.response as Response

  const { path = [] } = await routeContext.params
  const accounting = await getAccountingProviderClient()

  if (path.length === 1 && path[0] === 'connections') {
    const body = (await request.json().catch(() => ({}))) as CreateBody
    const providerId =
      typeof body.providerId === 'string' ? body.providerId.trim() : ''
    const name = typeof body.name === 'string' ? body.name.trim() : ''
    if (!providerId || !name)
      return apiError('Provider and connection name are required.', {
        status: 400,
      })

    const environment: AccountingProviderEnvironment | undefined =
      body.environment === 'sandbox' || body.environment === 'live'
        ? body.environment
        : undefined
    const mode: AccountingConnectionMode | undefined =
      body.mode === 'native' ||
      body.mode === 'mirror' ||
      body.mode === 'provider-backed'
        ? body.mode
        : undefined

    const result = await accounting.accountingProviders.connections.create({
      organizationId: gate.context.orgId,
      providerId,
      name,
      environment,
      mode,
    })
    if (result.error || !result.data)
      return providerError(result, 'Failed to create the accounting connection.')
    return apiSuccess(result.data, { status: 201 })
  }

  const action = connectionAction(path)
  if (!action?.connectionId)
    return apiError('Unknown accounting-provider action.', { status: 404 })

  const params = {
    organizationId: gate.context.orgId,
    connectionId: action.connectionId,
  }

  if (action.action === 'authorize') {
    const result = await accounting.accountingProviders.connections.authorize(
      params
    )
    if (result.error || !result.data)
      return providerError(result, 'Failed to start provider authorization.')
    return apiSuccess(result.data)
  }

  if (action.action === 'validate') {
    const result = await accounting.accountingProviders.connections.validate(
      params
    )
    if (result.error || !result.data)
      return providerError(result, 'Failed to validate the accounting connection.')
    return apiSuccess(result.data)
  }

  if (action.action === 'reconcile') {
    const result = await accounting.accountingProviders.connections.reconcile(
      params
    )
    if (result.error || !result.data)
      return providerError(result, 'Failed to queue accounting reconciliation.')
    return apiSuccess(result.data)
  }

  return apiError('Unknown accounting-provider action.', { status: 404 })
}

export async function DELETE(
  _request: Request,
  routeContext: RouteContext
): Promise<Response> {
  const gate = await requireAccountingProviderManager()
  if (gate.response || !gate.context) return gate.response as Response

  const { path = [] } = await routeContext.params
  const action = connectionAction(path)
  if (!action?.connectionId || action.action)
    return apiError('Unknown accounting-provider action.', { status: 404 })

  const accounting = await getAccountingProviderClient()
  const result = await accounting.accountingProviders.connections.delete({
    organizationId: gate.context.orgId,
    connectionId: action.connectionId,
  })
  if (result.error || !result.data)
    return providerError(result, 'Failed to disable the accounting connection.')
  return apiSuccess(result.data)
}
