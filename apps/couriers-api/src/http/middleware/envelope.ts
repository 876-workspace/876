import type { NextFunction, Request, Response } from 'express'

const RAW_JSON_PATHS = new Set(['/openapi.json'])

function isRawJsonPath(path: string): boolean {
  return RAW_JSON_PATHS.has(path)
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

function clientSafeError(
  source: unknown,
  status: number
): { code: string; message: string } {
  return { code: errorCode(source, status), message: errorMessage(source) }
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
    if (res.statusCode === 204) return originalJson(payload)
    return originalJson(envelopePayload(payload, res.statusCode))
  }
  next()
}
