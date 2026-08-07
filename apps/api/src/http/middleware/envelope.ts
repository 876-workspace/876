import type { NextFunction, Request, Response } from 'express'

/**
 * Wrap JSON responses in the canonical `{ data, error }` envelope.
 *
 * Applied as middleware so a controller returns the resource itself
 * (`res.json(user)`) and never hand-builds the envelope.
 */

/**
 * Paths whose JSON shape is defined outside the 876 API contract and must pass
 * through untouched.
 *
 * `/health` is on this list: it is a liveness probe whose body is consumed by
 * Cloudflare and by monitoring, not by the SDK. The OAuth discovery and JWKS
 * documents are defined by RFC 8414 and RFC 7517 — enveloping them would make
 * this service fail every standards-compliant OIDC client.
 */
const RAW_JSON_PATHS = new Set([
  '/health',
  '/openapi.json',
  '/docs',
  '/redoc',
  '/oauth/.well-known/openid-configuration',
  '/oauth/.well-known/jwks.json',
])

function isRawJsonPath(path: string): boolean {
  return RAW_JSON_PATHS.has(path) || path.startsWith('/docs/')
}

function isEnvelope(
  payload: unknown
): payload is { data: unknown; error: unknown } {
  return (
    typeof payload === 'object' &&
    payload !== null &&
    'data' in payload &&
    'error' in payload
  )
}

function errorMessage(source: unknown): string {
  if (typeof source === 'string') return source
  if (typeof source === 'object' && source !== null) {
    const record = source as Record<string, unknown>
    if (typeof record.message === 'string') return record.message
    if (typeof record.error_description === 'string')
      return record.error_description
  }
  return 'An error occurred.'
}

function errorCode(source: unknown, status: number): string {
  if (typeof source === 'string') return source
  if (typeof source === 'object' && source !== null) {
    const record = source as Record<string, unknown>
    if (typeof record.code === 'string') return record.code
  }
  return status === 404 ? 'error/not-found' : 'error/http'
}

/** Normalize an error and strip the server-only HTTP status metadata. */
function clientSafeError(
  source: unknown,
  status: number
): Record<string, unknown> {
  const normalized: Record<string, unknown> =
    typeof source === 'object' && source !== null
      ? { ...(source as object) }
      : {}

  for (const key of ['httpStatus', 'http_status', 'status', 'status_code']) {
    delete normalized[key]
  }
  normalized.code = errorCode(source, status)
  normalized.message = errorMessage(source)

  return normalized
}

export function envelopePayload(payload: unknown, status: number): unknown {
  if (isEnvelope(payload)) {
    return payload.error === null || payload.error === undefined
      ? { data: payload.data, error: null }
      : { data: null, error: clientSafeError(payload.error, status) }
  }

  if (status < 400) return { data: payload, error: null }

  const isRecord = typeof payload === 'object' && payload !== null
  const rawError =
    isRecord && 'error' in payload
      ? (payload as Record<string, unknown>).error
      : payload

  if (typeof rawError === 'object' && rawError !== null)
    return { data: null, error: clientSafeError(rawError, status) }

  // When the error is a bare string, the message is read from the *whole*
  // payload rather than from the string. That is what lets an RFC 6749 body —
  // `{ error: "invalid_grant", error_description: "..." }` — keep its
  // description instead of reporting the code twice.
  return {
    data: null,
    error: {
      code: errorCode(rawError, status),
      message: errorMessage(isRecord ? payload : rawError),
    },
  }
}

export function envelope(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (isRawJsonPath(req.path)) return next()

  const originalJson = res.json.bind(res)
  res.json = (payload: unknown) => {
    // 204 carries no body; enveloping it would violate the status.
    if (res.statusCode === 204) return originalJson(payload)
    return originalJson(envelopePayload(payload, res.statusCode))
  }

  next()
}
