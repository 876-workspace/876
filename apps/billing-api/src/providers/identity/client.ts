import { getSettings } from '@/config'
import { getLogger } from '@/platform/logger'

import {
  IdentityUnavailableError,
  type IdentityApp,
  type IdentityGateway,
  type OrganizationMembership,
  type TokenIntrospection,
} from './types'

const log = getLogger('identity')

const MAX_ATTEMPTS = 2
const RETRYABLE_STATUSES = new Set([408, 425, 429, 500, 502, 503, 504])

function timeoutSignal(timeoutMs: number): AbortSignal {
  return AbortSignal.timeout(timeoutMs)
}

function isTimeoutError(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error.name === 'AbortError' || error.name === 'TimeoutError')
  )
}

function unwrapEnvelope(raw: unknown): unknown {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return raw

  const record = raw as Record<string, unknown>
  if ('data' in record && 'error' in record) {
    if (record.error !== null) return null
    return record.data
  }
  return raw
}

function unavailable(options: {
  attempts?: number
  path: string
  reason: ConstructorParameters<typeof IdentityUnavailableError>[0]['reason']
  status?: number | null
}): IdentityUnavailableError {
  return new IdentityUnavailableError({
    attempts: options.attempts ?? 1,
    path: options.path,
    reason: options.reason,
    status: options.status,
  })
}

function requireObject(
  payload: unknown,
  path: string
): Record<string, unknown> {
  if (typeof payload !== 'object' || payload === null || Array.isArray(payload))
    throw unavailable({ path, reason: 'invalid-response' })
  return payload as Record<string, unknown>
}

export class HttpIdentityGateway implements IdentityGateway {
  async appForApiKey(apiKey: string): Promise<IdentityApp | null> {
    const path = '/apps/current'
    try {
      const payload = requireObject(
        await this.request(path, {
          method: 'GET',
          headers: { 'x-876-api-key': apiKey },
        }),
        path
      )
      if (typeof payload.id !== 'string' || !payload.id.trim())
        throw unavailable({ path, reason: 'invalid-response' })
      return { id: payload.id }
    } catch (error) {
      if (
        error instanceof IdentityUnavailableError &&
        (error.status === 401 || error.status === 403)
      )
        return null
      throw error
    }
  }

  async introspect(token: string): Promise<TokenIntrospection> {
    const path = '/oauth/introspect'
    const settings = getSettings()
    if (!settings.identityApiKey) {
      log.error(
        { reason: 'missing_resource_server_key' },
        'identity.introspection.disabled'
      )
      throw unavailable({ path, reason: 'configuration', attempts: 0 })
    }

    const payload = requireObject(
      await this.request(path, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${settings.identityApiKey}`,
          'content-type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({ token }),
      }),
      path
    )

    if (payload.active === false) {
      return { active: false, subject: null, appId: null, scopes: new Set() }
    }
    if (
      payload.active !== true ||
      typeof payload.sub !== 'string' ||
      !payload.sub.trim()
    )
      throw unavailable({ path, reason: 'invalid-response' })

    return {
      active: true,
      subject: payload.sub,
      appId: typeof payload.app_id === 'string' ? payload.app_id : null,
      scopes: new Set(
        typeof payload.scope === 'string'
          ? payload.scope.split(' ').filter(Boolean)
          : []
      ),
    }
  }

  async organizationMembership(
    token: string,
    organizationId: string
  ): Promise<OrganizationMembership | null> {
    const path = '/users/me/memberships?status=active'
    const settings = getSettings()
    if (!settings.identityApiKey)
      throw unavailable({ path, reason: 'configuration', attempts: 0 })

    const payload = requireObject(
      await this.request(path, {
        method: 'GET',
        headers: {
          authorization: `Bearer ${token}`,
          'x-876-api-key': settings.identityApiKey,
        },
      }),
      path
    )
    if (!Array.isArray(payload.data))
      throw unavailable({ path, reason: 'invalid-response' })

    for (const value of payload.data) {
      if (typeof value !== 'object' || value === null || Array.isArray(value))
        throw unavailable({ path, reason: 'invalid-response' })

      const membership = value as Record<string, unknown>
      const organization = membership.organization
      if (
        typeof organization !== 'object' ||
        organization === null ||
        Array.isArray(organization)
      )
        throw unavailable({ path, reason: 'invalid-response' })

      const organizationRecord = organization as Record<string, unknown>
      if (
        typeof organizationRecord.id !== 'string' ||
        typeof organizationRecord.status !== 'string'
      )
        throw unavailable({ path, reason: 'invalid-response' })

      if (
        organizationRecord.id !== organizationId ||
        organizationRecord.status !== 'active'
      )
        continue

      if (typeof membership.role !== 'string')
        throw unavailable({ path, reason: 'invalid-response' })

      return {
        role:
          membership.role === 'owner' || membership.role === 'admin'
            ? membership.role
            : 'member',
      }
    }
    return null
  }

  private async request(path: string, init: RequestInit): Promise<unknown> {
    const settings = getSettings()

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
      let response: Response
      try {
        response = await fetch(`${settings.identityApiUrl}${path}`, {
          ...init,
          signal: timeoutSignal(settings.identityTimeoutMs),
        })
      } catch (error) {
        const reason = isTimeoutError(error) ? 'timeout' : 'network'
        if (attempt < MAX_ATTEMPTS) {
          log.warn(
            { attempt, path, reason },
            'identity.request.retrying'
          )
          continue
        }
        log.error({ err: error, path, reason }, 'identity.request.failed')
        throw unavailable({ attempts: attempt, path, reason })
      }

      if (!response.ok) {
        if (
          RETRYABLE_STATUSES.has(response.status) &&
          attempt < MAX_ATTEMPTS
        ) {
          log.warn(
            { attempt, path, status: response.status },
            'identity.request.retrying'
          )
          continue
        }
        log.warn(
          { attempt, path, status: response.status },
          'identity.request.rejected'
        )
        throw unavailable({
          attempts: attempt,
          path,
          reason: 'upstream',
          status: response.status,
        })
      }

      let raw: unknown
      try {
        raw = await response.json()
      } catch (error) {
        if (attempt < MAX_ATTEMPTS) {
          log.warn(
            { attempt, path, reason: 'invalid_response_body' },
            'identity.request.retrying'
          )
          continue
        }
        log.error({ err: error, path }, 'identity.response.invalid')
        throw unavailable({
          attempts: attempt,
          path,
          reason: 'invalid-response',
        })
      }

      const payload = unwrapEnvelope(raw)
      if (payload === null || payload === undefined) {
        log.error({ path }, 'identity.response.invalid')
        throw unavailable({
          attempts: attempt,
          path,
          reason: 'invalid-response',
        })
      }
      return payload
    }

    throw unavailable({
      attempts: MAX_ATTEMPTS,
      path,
      reason: 'network',
    })
  }
}
