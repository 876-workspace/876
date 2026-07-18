'use client'

import { create876Client } from '@876/sdk'

import { AnalyticsEvent } from '@/lib/analytics/events'
import { track } from '@/lib/analytics/track'

async function fetchWithAnalytics(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const requestId = crypto.randomUUID()
  const headers = new Headers(init?.headers)
  headers.set('x-request-id', requestId)

  try {
    const response = await fetch(input, { ...init, headers })

    if (!response.ok) {
      const payload = await response
        .clone()
        .json()
        .catch(() => null)
      const error = payload?.error ?? payload

      track(AnalyticsEvent.ApiError, {
        properties: {
          path: getRequestPath(input),
          method: init?.method ?? 'GET',
          status_code: response.status,
          error_code: error?.code ?? null,
          error_message: error?.message ?? null,
          request_id: requestId,
        },
      })
    }

    return response
  } catch (error) {
    track(AnalyticsEvent.NetworkRequestFailed, {
      error: error instanceof Error ? error : null,
      properties: {
        path: getRequestPath(input),
        method: init?.method ?? 'GET',
        request_id: requestId,
      },
    })

    throw error
  }
}

function getRequestPath(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input
  if (input instanceof URL) return input.pathname
  return input.url
}

/**
 * Browser auth-bridge client for the embedded login/logout surfaces. Talks to
 * the same-origin `/api` bridge and tags each request for analytics.
 */
export const authClient = create876Client({
  baseUrl: '/api',
  fetch: fetchWithAnalytics,
})
