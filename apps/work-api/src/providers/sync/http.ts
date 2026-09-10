import { WorkSyncProviderError } from './provider.js'

const PROVIDER_TIMEOUT_MS = 30_000

export async function providerResponse(
  input: string | URL,
  init: RequestInit = {},
  unavailableMessage = 'The calendar provider could not be reached.'
): Promise<Response> {
  try {
    return await fetch(input, {
      ...init,
      signal: init.signal ?? AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
    })
  } catch {
    throw new WorkSyncProviderError('provider-unavailable', unavailableMessage)
  }
}

export function retryAfterSeconds(response: Response): number | null {
  const raw = response.headers.get('retry-after')
  if (!raw) return null

  const seconds = Number(raw)
  if (Number.isFinite(seconds) && seconds >= 0) return Math.floor(seconds)

  const date = Date.parse(raw)
  if (!Number.isFinite(date)) return null
  return Math.max(0, Math.ceil((date - Date.now()) / 1000))
}

export async function providerFetch(
  input: string | URL,
  init: RequestInit = {}
): Promise<Response> {
  const response = await providerResponse(input, init)

  if (response.ok) return response

  if (response.status === 401 || response.status === 403)
    throw new WorkSyncProviderError(
      'provider-unauthorized',
      'The calendar provider authorization is no longer valid.'
    )

  if (response.status === 410)
    throw new WorkSyncProviderError(
      'provider-cursor-invalid',
      'The calendar provider synchronization cursor is no longer valid.'
    )

  if (response.status === 429)
    throw new WorkSyncProviderError(
      'provider-rate-limited',
      'The calendar provider temporarily rate limited synchronization.',
      retryAfterSeconds(response)
    )

  if (response.status >= 500)
    throw new WorkSyncProviderError(
      'provider-unavailable',
      'The calendar provider is temporarily unavailable.'
    )

  throw new WorkSyncProviderError(
    'provider-invalid-response',
    'The calendar provider rejected the synchronization request.'
  )
}

export async function providerJson<T>(
  input: string | URL,
  init: RequestInit = {}
): Promise<T> {
  const response = await providerFetch(input, init)
  try {
    return (await response.json()) as T
  } catch {
    throw new WorkSyncProviderError(
      'provider-invalid-response',
      'The calendar provider returned invalid JSON.'
    )
  }
}

export function requireHttpsProviderUrl(value: string, allowedOrigin?: string) {
  let url: URL
  try {
    url = new URL(value)
  } catch {
    throw new WorkSyncProviderError(
      'provider-invalid-response',
      'The calendar provider returned an invalid URL.'
    )
  }

  const local = url.hostname === 'localhost' || url.hostname === '127.0.0.1'
  if (url.protocol !== 'https:' && !(local && url.protocol === 'http:'))
    throw new WorkSyncProviderError(
      'provider-invalid-response',
      'The calendar provider URL must use HTTPS.'
    )

  if (allowedOrigin && url.origin !== allowedOrigin)
    throw new WorkSyncProviderError(
      'provider-invalid-response',
      'The calendar provider returned an unexpected origin.'
    )

  return url
}
