/**
 * Narrow PostHog management API client for the shared 876 project.
 *
 * Uses the global `fetch` with `AbortSignal.timeout` — no axios, no node-fetch,
 * no PostHog SDK. One client instance per credential set is the intended usage;
 * see the factory `getPostHogClient` below.
 *
 * No credentials are ever logged.
 */

import type { Settings } from '@/config'
import { AppHttpError } from '@/platform/errors'
import { getLogger } from '@/platform/logger'

const log = getLogger('posthog')

export class PostHogClient {
  private readonly baseUrl: string
  private readonly projectId: number
  private readonly headers: Record<string, string>
  private readonly timeoutMs: number

  constructor(opts: {
    host: string
    projectId: number
    personalApiKey: string
    timeoutMs?: number
  }) {
    this.baseUrl = opts.host.replace(/\/$/, '')
    this.projectId = opts.projectId
    this.headers = {
      Authorization: `Bearer ${opts.personalApiKey}`,
      'Content-Type': 'application/json',
    }
    this.timeoutMs = opts.timeoutMs ?? 20_000
  }

  async listFeatures(): Promise<Record<string, unknown>[]> {
    let url: string | null = this.featureUrl()
    const features: Record<string, unknown>[] = []

    while (url) {
      const payload = await this.request('GET', url)
      const results = payload['results']
      if (Array.isArray(results)) {
        for (const item of results) {
          if (
            item !== null &&
            typeof item === 'object' &&
            !Array.isArray(item)
          ) {
            features.push(item as Record<string, unknown>)
          }
        }
      }
      const next = payload['next']
      url = next && typeof next === 'string' ? next : null
    }

    return features
  }

  async createFeature(params: {
    key: string
    name: string
    description: string | null
    enabled: boolean
  }): Promise<Record<string, unknown>> {
    const body = {
      key: params.key,
      name: params.description || params.name,
      active: params.enabled,
      filters: { groups: [{ properties: [], rollout_percentage: 100 }] },
      evaluation_runtime: 'server',
    }
    return this.request('POST', this.featureUrl(), body)
  }

  async updateFeature(
    featureId: string,
    params: { key?: string; description?: string; enabled?: boolean }
  ): Promise<Record<string, unknown>> {
    const body: Record<string, unknown> = {}
    if (params.key !== undefined) body['key'] = params.key
    if (params.description !== undefined) body['name'] = params.description
    if (params.enabled !== undefined) body['active'] = params.enabled
    return this.request('PATCH', this.featureUrl(featureId), body)
  }

  async deleteFeature(featureId: string): Promise<void> {
    await this.request('DELETE', this.featureUrl(featureId))
  }

  private featureUrl(featureId?: string): string {
    return `${this.baseUrl}/api/projects/${this.projectId}/feature_flags${featureId ? `/${featureId}/` : '/'}`
  }

  private async request(
    method: string,
    url: string,
    body?: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    let response: Response
    try {
      response = await fetch(url, {
        method,
        headers: this.headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(this.timeoutMs),
      })
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
    } catch (err) {
      throw new AppHttpError({
        code: 'provider/posthog-error',
        message: 'PostHog feature flag request failed.',
        httpStatus: 502,
        cause: err,
      })
    }

    if (response.status === 204) {
      return {}
    }

    let payload: unknown
    try {
      payload = await response.json()
    } catch (err) {
      throw new AppHttpError({
        code: 'provider/posthog-error',
        message: 'PostHog feature flag request failed.',
        httpStatus: 502,
        cause: err,
      })
    }

    if (
      payload === null ||
      typeof payload !== 'object' ||
      Array.isArray(payload)
    ) {
      throw new AppHttpError({
        code: 'provider/posthog-invalid',
        message: 'PostHog returned an invalid feature flag response.',
        httpStatus: 502,
      })
    }

    return payload as Record<string, unknown>
  }
}

/**
 * Build a {@link PostHogClient} from application settings.
 *
 * Throws a 503 {@link AppHttpError} if any of the three required credentials
 * are absent.
 */
export function getPostHogClient(settings: Settings): PostHogClient {
  const { personalApiKey, projectId, host } = settings.posthog
  const id = Number(projectId)

  if (!personalApiKey || !host || !id || Number.isNaN(id)) {
    throw new AppHttpError({
      code: 'provider/misconfigured',
      message:
        'PostHog feature management is not configured. Set POSTHOG_PERSONAL_API_KEY, POSTHOG_PROJECT_ID, and POSTHOG_HOST.',
      httpStatus: 503,
    })
  }

  return new PostHogClient({ host, projectId: id, personalApiKey })
}

/**
 * Sends one analytics event, best-effort.
 *
 * Uses the project (publishable) key against PostHog's capture endpoint,
 * which is a different credential and endpoint from the feature-flag
 * management API above. Every failure is swallowed: analytics is never
 * allowed to affect the request that produced the event.
 */
export async function captureEvent(
  settings: Settings,
  params: {
    distinctId: string
    event: string
    properties: Record<string, unknown>
  }
): Promise<void> {
  const apiKey = settings.posthog.projectApiKey
  if (!apiKey) return

  const host = settings.posthog.host.replace(/\/$/, '')
  if (!host) return

  const properties: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(params.properties)) {
    if (value !== null && value !== undefined) properties[key] = value
  }

  const body = {
    // snake_case — PostHog wire fields, not internal names.
    api_key: apiKey,
    event: params.event,
    distinct_id: params.distinctId,
    properties,
  }

  try {
    await fetch(`${host}/capture/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(5_000),
    })
  } catch (err) {
    // Never rethrown: analytics may not affect the request that produced it.
    log.warn(
      {
        event: params.event,
        error_type: err instanceof Error ? err.name : typeof err,
      },
      'posthog.capture_failed'
    )
  }
}
