import 'server-only'

import { apiError, apiSuccess } from '@876/core/api'

import { getContext, hasPermission } from '@/lib/auth/billing-context'
import type { Permission } from '@/types/access'
import type { Context } from '@/types/auth'

type AuthorizedContext = Context & {
  tenant: NonNullable<Context['tenant']>
  access: NonNullable<Context['access']>
}

type PermissionAccess =
  | { context: AuthorizedContext; response: null }
  | { context: null; response: Response }

/** Authorizes one permission for every tenant API request, deny-by-default. */
export async function requirePermission(
  permission: Permission
): Promise<PermissionAccess> {
  const context = await getContext()
  if (!context) {
    return {
      context: null,
      response: apiError('Billing workspace access is required.', {
        status: 401,
      }),
    }
  }

  if (!context.tenant || context.accessStatus !== 'active') {
    return {
      context: null,
      response: apiError('An active 876 Billing workspace is required.', {
        status: 403,
      }),
    }
  }

  if (
    !context.access ||
    context.access.status !== 'ACTIVE' ||
    !hasPermission(context, permission)
  ) {
    return {
      context: null,
      response: apiError('Insufficient Billing permissions.', { status: 403 }),
    }
  }

  return { context: context as AuthorizedContext, response: null }
}

/** Converts Prisma BigInt fields into JSON-safe strings at the API boundary. */
export function serializeValue(value: unknown): unknown {
  if (typeof value === 'bigint') return value.toString()
  if (Array.isArray(value)) return value.map(serializeValue)
  if (value === null || typeof value !== 'object') return value
  if ('toJSON' in value && typeof value.toJSON === 'function')
    return serializeValue(value.toJSON())

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .map(([key, nestedValue]) => [key, serializeValue(nestedValue)])
      .filter(
        ([key]) => key !== 'sourceIdempotencyKey' && key !== 'sourcePayloadHash'
      )
  )
}

/** Wraps a persisted Billing record in its Stripe-style resource discriminator. */
export function Resource<T extends object>(
  object: string,
  value: T
): Record<string, unknown> {
  return {
    ...(serializeValue(value) as Record<string, unknown>),
    object,
  }
}

/** Serializes a tenant-owned record without exposing its internal tenant key. */
export function TenantResource<T extends { tenantId: unknown }>(
  object: string,
  value: T
): Record<string, unknown> {
  const { tenantId, ...resource } = value
  return Resource(object, resource)
}

/** Creates a JSON-safe Stripe-style list object. */
export function List<T extends object>(
  url: string,
  values: T[],
  object: string
): Record<string, unknown> {
  return {
    object: 'list',
    data: values.map((value) => Resource(object, value)),
    has_more: false,
    total_count: values.length,
    url,
  }
}

export { apiError, apiSuccess }
