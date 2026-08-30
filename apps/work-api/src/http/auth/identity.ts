export type IdentityApp = { id: string; slug: string }

export type IdentitySessionAccess = {
  userId: string
  appId: string
  appSlug: string
  assigned: boolean
  entitled: boolean
  status: string
  effectivePermissions: ReadonlySet<string>
}

export type IdentityGateway = {
  appForApiKey(apiKey: string): Promise<IdentityApp | null>
  sessionAccess(params: {
    apiKey: string
    accessToken: string
    organizationId: string
    appId: string
  }): Promise<IdentitySessionAccess | null>
}

export class IdentityUnavailableError extends Error {
  constructor() {
    super('The identity service could not verify the request.')
    this.name = 'IdentityUnavailableError'
  }
}

function apiUrl() {
  return (process.env.API_URL ?? 'http://127.0.0.1:4000').replace(/\/+$/, '')
}

async function requestIdentity(path: string, headers: Record<string, string>) {
  let response: Response
  try {
    response = await fetch(`${apiUrl()}${path}`, {
      headers,
      signal: AbortSignal.timeout(5_000),
    })
  } catch {
    throw new IdentityUnavailableError()
  }

  if (
    response.status === 401 ||
    response.status === 403 ||
    response.status === 404
  )
    return null
  if (!response.ok) throw new IdentityUnavailableError()

  let raw: unknown
  try {
    raw = await response.json()
  } catch {
    throw new IdentityUnavailableError()
  }
  return unwrapEnvelope(raw)
}

export class HttpIdentityGateway implements IdentityGateway {
  async appForApiKey(apiKey: string): Promise<IdentityApp | null> {
    const payload = await requestIdentity('/apps/current', {
      'x-876-api-key': apiKey,
    })
    if (payload === null) return null
    if (!isApp(payload)) throw new IdentityUnavailableError()
    return { id: payload.id, slug: payload.slug }
  }

  async sessionAccess(params: {
    apiKey: string
    accessToken: string
    organizationId: string
    appId: string
  }): Promise<IdentitySessionAccess | null> {
    const payload = await requestIdentity(
      `/organizations/${encodeURIComponent(params.organizationId)}/apps/${encodeURIComponent(params.appId)}/members/me`,
      {
        'x-876-api-key': params.apiKey,
        authorization: `Bearer ${params.accessToken}`,
      }
    )
    if (payload === null) return null
    if (!isAppMembership(payload)) throw new IdentityUnavailableError()
    return {
      userId: payload.user_id,
      appId: payload.app_id,
      appSlug: payload.app_slug,
      assigned: payload.assigned,
      entitled: payload.entitled,
      status: payload.status,
      effectivePermissions: new Set(payload.effective_permissions),
    }
  }
}

function unwrapEnvelope(raw: unknown): unknown {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return raw
  const record = raw as Record<string, unknown>
  if ('data' in record && 'error' in record)
    return record.error === null ? record.data : null
  return raw
}

function isApp(value: unknown): value is { id: string; slug: string } {
  if (typeof value !== 'object' || value === null || Array.isArray(value))
    return false
  const record = value as Record<string, unknown>
  return (
    typeof record.id === 'string' &&
    Boolean(record.id) &&
    typeof record.slug === 'string' &&
    Boolean(record.slug)
  )
}

function isAppMembership(value: unknown): value is {
  user_id: string
  app_id: string
  app_slug: string
  assigned: boolean
  entitled: boolean
  status: string
  effective_permissions: string[]
} {
  if (typeof value !== 'object' || value === null || Array.isArray(value))
    return false
  const record = value as Record<string, unknown>
  return (
    typeof record.user_id === 'string' &&
    typeof record.app_id === 'string' &&
    typeof record.app_slug === 'string' &&
    typeof record.assigned === 'boolean' &&
    typeof record.entitled === 'boolean' &&
    typeof record.status === 'string' &&
    Array.isArray(record.effective_permissions) &&
    record.effective_permissions.every(
      (permission) => typeof permission === 'string'
    )
  )
}
