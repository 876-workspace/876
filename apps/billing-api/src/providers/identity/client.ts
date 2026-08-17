import { getSettings } from '@/config'
import { getLogger } from '@/platform/logger'

import type {
  IdentityApp,
  IdentityGateway,
  OrganizationMembership,
  TokenIntrospection,
} from './types'

const log = getLogger('identity')

function timeoutSignal(timeoutMs: number): AbortSignal {
  return AbortSignal.timeout(timeoutMs)
}

export class HttpIdentityGateway implements IdentityGateway {
  async appForApiKey(apiKey: string): Promise<IdentityApp | null> {
    const payload = await this.request('/apps/current', {
      method: 'GET',
      headers: { 'x-876-api-key': apiKey },
    })
    return typeof payload?.id === 'string' && payload.id
      ? { id: payload.id }
      : null
  }

  async introspect(token: string): Promise<TokenIntrospection> {
    const settings = getSettings()
    if (!settings.identityApiKey) {
      log.error(
        { reason: 'missing_resource_server_key' },
        'identity.introspection.disabled'
      )
      return { active: false, subject: null, appId: null, scopes: new Set() }
    }
    const payload = await this.request('/oauth/introspect', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${settings.identityApiKey}`,
        'content-type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ token }),
    })
    if (payload?.active !== true) {
      return { active: false, subject: null, appId: null, scopes: new Set() }
    }
    return {
      active: true,
      subject: typeof payload.sub === 'string' ? payload.sub : null,
      appId: typeof payload.app_id === 'string' ? payload.app_id : null,
      scopes: new Set(
        typeof payload.scope === 'string' ? payload.scope.split(' ') : []
      ),
    }
  }

  async organizationMembership(
    token: string,
    organizationId: string
  ): Promise<OrganizationMembership | null> {
    const settings = getSettings()
    if (!settings.identityApiKey) return null
    const payload = await this.request('/users/me/memberships?status=active', {
      method: 'GET',
      headers: {
        authorization: `Bearer ${token}`,
        'x-876-api-key': settings.identityApiKey,
      },
    })
    const rows = Array.isArray(payload?.data) ? payload.data : []
    for (const value of rows) {
      if (typeof value !== 'object' || value === null) continue
      const membership = value as Record<string, unknown>
      const organization = membership.organization
      if (
        typeof organization !== 'object' ||
        organization === null ||
        (organization as Record<string, unknown>).id !== organizationId ||
        (organization as Record<string, unknown>).status !== 'active'
      )
        continue

      const role = membership.role
      return {
        role: role === 'owner' || role === 'admin' ? role : 'member',
      }
    }
    return null
  }

  private async request(
    path: string,
    init: RequestInit
  ): Promise<Record<string, unknown> | null> {
    const settings = getSettings()
    try {
      const response = await fetch(`${settings.identityApiUrl}${path}`, {
        ...init,
        signal: timeoutSignal(settings.identityTimeoutMs),
      })
      if (!response.ok) {
        log.warn({ path, status: response.status }, 'identity.request.rejected')
        return null
      }
      const raw: unknown = await response.json()
      if (typeof raw !== 'object' || raw === null) return null
      const record = raw as Record<string, unknown>
      const data = 'data' in record ? record.data : record
      return typeof data === 'object' && data !== null
        ? (data as Record<string, unknown>)
        : null
    } catch (error) {
      log.error({ err: error, path }, 'identity.request.failed')
      return null
    }
  }
}
