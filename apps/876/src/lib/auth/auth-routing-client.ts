import 'server-only'

import {
  CLIENT_INVALID_RESPONSE_ERROR,
  NETWORK_OFFLINE_ERROR,
  resolve876ApiBaseUrl,
  sendClientRequest,
} from '@876/core/client'
import type { ClientHttpMethod } from '@876/core/client'
import type { LookupResult } from '@876/core/client/lookup'
import { headers } from 'next/headers'

type AuthRoutingUserRow = {
  id: string
  workos_user_id: string
  email: string
  first_name: string | null
  last_name: string | null
  avatar: string | null
  role: string | null
  permissions: string[] | null
  status: string | null
  banned: boolean | null
}

type AuthRoutingMembership = {
  id: string
  role: string
  status: string
  organization: {
    id: string
    name: string | null
    slug: string
    status: string
  }
}

type AuthRoutingUserFeature = {
  id: string
  slug: string
  status: string
}

type AuthRoutingFeature = {
  id: string
  slug: string
  enabled: boolean
}

type AuthRoutingList<T> = {
  object: 'list'
  data: T[]
  has_more: boolean
  url: string
  total_count: number | null
}

type AuthRoutingRuntime = {
  baseUrl: string
  internalKey?: string
  apiKey?: string
  requestId?: string
  fetch: typeof fetch
}

type AuthRoutingRequestInit = {
  method: ClientHttpMethod
  path: string
  query?: Record<string, string | number | boolean | undefined>
}

const authRoutingBaseUrlEnvKeys = [
  'API_URL',
  'NEXT_PUBLIC_876_API_URL',
  'NEXT_PUBLIC_API_URL',
] as const

export async function getAuthRoutingClient() {
  const requestId = (await headers()).get('x-request-id') ?? undefined
  const runtime: AuthRoutingRuntime = {
    baseUrl: resolve876ApiBaseUrl(undefined, authRoutingBaseUrlEnvKeys).replace(
      /\/$/,
      ''
    ),
    internalKey: process.env.API_INTERNAL_KEY,
    apiKey: process.env.API_876_KEY,
    requestId,
    fetch: globalThis.fetch.bind(globalThis),
  }

  return {
    auth: {
      getRoutingMemberships(params: {
        userId: string
        orgSlug?: string
        status?: string
      }) {
        return authRoutingRequest<AuthRoutingList<AuthRoutingMembership>>(
          runtime,
          {
            method: 'GET',
            path: '/auth/routing/memberships',
            query: {
              userId: params.userId,
              orgSlug: params.orgSlug,
              status: params.status,
            },
          }
        )
      },
    },
    features: {
      evaluate(params: {
        userId?: string
        organizationId?: string
        appId?: string
        appSlug?: string
        includeGlobal?: boolean
      }) {
        return authRoutingRequest<AuthRoutingList<AuthRoutingFeature>>(
          runtime,
          {
            method: 'GET',
            path: '/features/evaluate',
            query: {
              userId: params.userId,
              organizationId: params.organizationId,
              appId: params.appId,
              appSlug: params.appSlug,
              includeGlobal: params.includeGlobal,
            },
          }
        )
      },
    },
    users: {
      retrieve(userId: string) {
        return authRoutingRequest<AuthRoutingUserRow>(runtime, {
          method: 'GET',
          path: `/users/${userId}`,
        })
      },
      retrieveByWorkosId(workosUserId: string) {
        return authRoutingRequest<AuthRoutingUserRow>(runtime, {
          method: 'GET',
          path: `/users/by-workos-id/${workosUserId}`,
        })
      },
      listFeatures(userId: string) {
        return authRoutingRequest<AuthRoutingList<AuthRoutingUserFeature>>(
          runtime,
          {
            method: 'GET',
            path: `/users/${userId}/features`,
          }
        )
      },
    },
  }
}

async function authRoutingRequest<T>(
  runtime: AuthRoutingRuntime,
  init: AuthRoutingRequestInit
): Promise<LookupResult<T>> {
  const result = await sendClientRequest(
    { baseUrl: runtime.baseUrl, fetch: runtime.fetch },
    {
      method: init.method,
      path: init.path,
      query: init.query,
      headers: authRoutingHeaders(runtime),
    }
  )

  if (result.networkError) {
    return {
      data: null,
      error: NETWORK_OFFLINE_ERROR,
    }
  }

  if (result.ok) {
    if (!isEnvelopePayload(result.payload)) {
      return { data: null, error: CLIENT_INVALID_RESPONSE_ERROR }
    }
    if (result.payload.error === null) {
      return { data: result.payload.data as T, error: null }
    }
  }

  const payload = result.payload as {
    error?: { code?: string; message?: string }
    code?: string
    message?: string
  } | null
  const error = payload?.error ?? payload

  return {
    data: null,
    error: {
      code: error?.code ?? 'admin/error',
      message: error?.message ?? 'An error occurred.',
    },
  }
}

function isEnvelopePayload(
  payload: unknown
): payload is { data: unknown; error: unknown } {
  return (
    typeof payload === 'object' &&
    payload !== null &&
    Object.prototype.hasOwnProperty.call(payload, 'data') &&
    Object.prototype.hasOwnProperty.call(payload, 'error') &&
    Object.keys(payload).every((key) => key === 'data' || key === 'error')
  )
}

function authRoutingHeaders(
  runtime: AuthRoutingRuntime
): Record<string, string> {
  const requestHeaders: Record<string, string> = {}

  if (runtime.internalKey)
    requestHeaders['x-internal-key'] = runtime.internalKey
  if (runtime.apiKey) requestHeaders['X-876-API-Key'] = runtime.apiKey
  if (runtime.requestId) requestHeaders['x-request-id'] = runtime.requestId

  return requestHeaders
}
