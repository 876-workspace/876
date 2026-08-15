import type { NextFunction, Request, Response } from 'express'

const rawPaths = new Set([
  '/docs',
  '/health',
  '/metrics',
  '/openapi.json',
  '/ready',
  '/redoc',
  '/internal/openapi.json',
])

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

function normalizeError(
  source: unknown,
  status: number
): Record<string, unknown> {
  const record =
    typeof source === 'object' && source !== null
      ? { ...(source as Record<string, unknown>) }
      : {}
  for (const key of ['httpStatus', 'http_status', 'status', 'status_code']) {
    delete record[key]
  }
  return {
    ...record,
    code:
      typeof record.code === 'string'
        ? record.code
        : status === 404
          ? 'error/not-found'
          : 'error/http',
    message:
      typeof record.message === 'string'
        ? record.message
        : typeof source === 'string'
          ? source
          : 'An error occurred.',
  }
}

export function envelopePayload(payload: unknown, status: number): unknown {
  if (isEnvelope(payload)) {
    return payload.error == null
      ? { data: payload.data, error: null }
      : { data: null, error: normalizeError(payload.error, status) }
  }
  if (status < 400) return { data: payload, error: null }
  const error =
    typeof payload === 'object' && payload !== null && 'error' in payload
      ? (payload as Record<string, unknown>).error
      : payload
  return { data: null, error: normalizeError(error, status) }
}

export function envelope(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (rawPaths.has(req.path)) return next()
  const json = res.json.bind(res)
  res.json = (payload: unknown) =>
    res.statusCode === 204
      ? json(payload)
      : json(envelopePayload(payload, res.statusCode))
  next()
}
