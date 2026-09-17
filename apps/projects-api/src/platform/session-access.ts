import { z } from 'zod'

import { getLogger } from './logger.js'
import { SessionIdentityUnavailable } from './session-verifier.js'

const log = getLogger('session')

const PROJECTS_APP_SLUG = '876-projects'
const CORE_TIMEOUT_MS = 10_000

const appSubscriptionSchema = z
  .object({ app_id: z.string().min(1) })
  .passthrough()

const membershipSchema = z
  .object({
    organization_id: z.string(),
    user_id: z.string(),
    status: z.string(),
    assigned: z.boolean(),
    entitled: z.boolean(),
    effective_permissions: z.array(z.string()),
    entitled_modules: z.array(z.string()).optional(),
    revoked_at: z.number().int().nullable(),
  })
  .passthrough()

export type SessionAccess = {
  userId: string
  organizationId: string
  appId: string
  modules: string[]
  permissions: string[]
}

export type SessionAccessOutcome =
  | { status: 'ok'; access: SessionAccess }
  | { status: 'denied' }
  | { status: 'unavailable' }

export type SessionAccessDeps = {
  coreBaseUrl?: string
  serviceKey?: string
  fetchImpl?: typeof fetch
}

/**
 * Resolves the canonical Projects self-access answer for one session caller.
 *
 * The environment-specific `876-projects` app id is resolved from the
 * organization's entitlement rather than hard-coded, then the acting user's
 * membership is read with the user's own bearer so Core — not this service —
 * decides membership, permissions, and field visibility. The membership must
 * name the token subject and the path organization; anything else is denied
 * rather than coerced.
 *
 * A missing entitlement, an inactive/revoked assignment, or a Core rejection
 * of the caller reads as `denied`. A Core outage reads as `unavailable` so
 * the route layer reports 503 instead of presenting an outage as a denial.
 */
export async function resolveSessionAccess(options: {
  token: string
  userId: string
  organizationId: string
  deps?: SessionAccessDeps
}): Promise<SessionAccessOutcome> {
  const coreBaseUrl = (options.deps?.coreBaseUrl ?? process.env.API_URL ?? '')
    .trim()
    .replace(/\/+$/, '')
  const serviceKey = (
    options.deps?.serviceKey ??
    process.env.PROJECTS_API_876_KEY ??
    ''
  ).trim()
  if (!coreBaseUrl || !serviceKey) {
    log.error('session.access.unconfigured')
    return { status: 'unavailable' }
  }

  const fetchImpl = options.deps?.fetchImpl ?? globalThis.fetch
  const call = { coreBaseUrl, serviceKey, fetchImpl }

  let appId: string | null
  try {
    appId = await resolveProjectsAppId(call, options.organizationId)
  } catch (error) {
    if (error instanceof SessionIdentityUnavailable)
      return { status: 'unavailable' }
    throw error
  }
  if (!appId) return { status: 'denied' }

  let membership: z.infer<typeof membershipSchema>
  try {
    const result = await readMembership(call, {
      token: options.token,
      organizationId: options.organizationId,
      appId,
    })
    if (!result) return { status: 'denied' }
    membership = result
  } catch (error) {
    if (error instanceof SessionIdentityUnavailable)
      return { status: 'unavailable' }
    throw error
  }

  if (
    membership.user_id !== options.userId ||
    membership.organization_id !== options.organizationId
  ) {
    log.warn('session.access.subject_mismatch')
    return { status: 'denied' }
  }

  const active =
    membership.status === 'active' &&
    membership.assigned &&
    membership.entitled &&
    membership.revoked_at === null
  if (!active) return { status: 'denied' }

  return {
    status: 'ok',
    access: {
      userId: membership.user_id,
      organizationId: membership.organization_id,
      appId,
      modules: membership.entitled_modules ?? [],
      permissions: membership.effective_permissions,
    },
  }
}

type CoreCall = {
  coreBaseUrl: string
  serviceKey: string
  fetchImpl: typeof fetch
}

async function resolveProjectsAppId(
  call: CoreCall,
  organizationId: string
): Promise<string | null> {
  const response = await coreGet(
    call,
    `/organizations/${encodeURIComponent(organizationId)}/apps/by-slug/${PROJECTS_APP_SLUG}`,
    null
  )
  if (response.status === 404) return null
  if (!response.ok) {
    log.error(
      { status: response.status },
      'session.access.app_resolution_failed'
    )
    throw new SessionIdentityUnavailable()
  }

  const payload = await response.json().catch(() => null)
  const envelope = unwrapEnvelope(payload)
  const parsed = appSubscriptionSchema.safeParse(envelope)
  if (!parsed.success) {
    log.error(
      { reason: 'invalid-response' },
      'session.access.app_resolution_failed'
    )
    throw new SessionIdentityUnavailable()
  }
  return parsed.data.app_id
}

async function readMembership(
  call: CoreCall,
  options: { token: string; organizationId: string; appId: string }
): Promise<z.infer<typeof membershipSchema> | null> {
  const response = await coreGet(
    call,
    `/organizations/${encodeURIComponent(options.organizationId)}/apps/${encodeURIComponent(options.appId)}/members/me`,
    options.token
  )
  if (
    response.status === 400 ||
    response.status === 401 ||
    response.status === 403 ||
    response.status === 404
  )
    return null
  if (!response.ok) {
    log.error({ status: response.status }, 'session.access.membership_failed')
    throw new SessionIdentityUnavailable()
  }

  const payload = await response.json().catch(() => null)
  const envelope = unwrapEnvelope(payload)
  const parsed = membershipSchema.safeParse(envelope)
  if (!parsed.success) {
    log.error(
      { reason: 'invalid-response' },
      'session.access.membership_failed'
    )
    throw new SessionIdentityUnavailable()
  }
  return parsed.data
}

async function coreGet(
  call: CoreCall,
  path: string,
  token: string | null
): Promise<Response> {
  const headers: Record<string, string> = {
    'X-876-API-Key': call.serviceKey,
  }
  if (token) headers.Authorization = `Bearer ${token}`

  try {
    return await call.fetchImpl(`${call.coreBaseUrl}${path}`, {
      method: 'GET',
      headers,
      signal: AbortSignal.timeout(CORE_TIMEOUT_MS),
    })
  } catch (error) {
    log.error(
      {
        error_type:
          error instanceof Error ? error.constructor.name : typeof error,
      },
      'session.access.core_unreachable'
    )
    throw new SessionIdentityUnavailable()
  }
}

function unwrapEnvelope(body: unknown): unknown {
  if (typeof body !== 'object' || body === null) return body
  const record = body as Record<string, unknown>
  return 'data' in record ? record.data : body
}
