import { HttpStatus } from './types/errors'
import type { AppError, HttpStatusCode } from './types/errors'

type ErrorInput =
  | AppError
  | {
      code?: string | null
      message?: string | null
    }
  | string

type ErrorOptions = {
  status?: HttpStatusCode | number
  code?: string
}

type EnvelopeInit = ResponseInit & {
  code?: string
}

const FALLBACK_ERROR = {
  code: 'error/unknown',
  message: 'An unexpected error occurred.',
} as const

const MESSAGE_CODE_BY_STATUS: Partial<Record<number, string>> = {
  [HttpStatus.BAD_REQUEST]: 'error/bad-request',
  [HttpStatus.UNAUTHORIZED]: 'auth/no-session',
  [HttpStatus.FORBIDDEN]: 'auth/forbidden',
  [HttpStatus.NOT_FOUND]: 'error/not-found',
  [HttpStatus.CONFLICT]: 'error/conflict',
  [HttpStatus.UNPROCESSABLE_ENTITY]: 'validation/invalid-request',
  [HttpStatus.TOO_MANY_REQUESTS]: 'error/rate-limited',
  [HttpStatus.INTERNAL_SERVER_ERROR]: 'error/unknown',
  [HttpStatus.BAD_GATEWAY]: 'provider/error',
  [HttpStatus.SERVICE_UNAVAILABLE]: 'error/unavailable',
}

export function apiSuccess<T>(data: T, init?: ResponseInit): Response {
  return Response.json({ data, error: null }, init)
}

export function apiJson(payload: unknown, init?: EnvelopeInit): Response {
  const status = init?.status
  const responseInit = withoutCode(init)
  const envelope = normalizeApiEnvelope(payload, {
    code: init?.code ?? (status ? MESSAGE_CODE_BY_STATUS[status] : undefined),
  })

  if (envelope) return Response.json(envelope, responseInit)

  return apiSuccess(payload, responseInit)
}

export function apiError(
  error: ErrorInput,
  options: ErrorOptions = {}
): Response {
  const status = options.status ?? HttpStatus.BAD_REQUEST

  return Response.json(
    {
      data: null,
      error: normalizeError(error, {
        code: options.code ?? MESSAGE_CODE_BY_STATUS[status],
      }),
    },
    { status }
  )
}

export function normalizeApiEnvelope<T>(
  payload: unknown,
  options: { code?: string } = {}
): { data: T; error: null } | { data: null; error: AppError } | null {
  if (typeof payload !== 'object' || payload === null) return null
  if (!('data' in payload) && !('error' in payload)) return null

  const record = payload as Record<string, unknown>
  const isCanonicalEnvelope =
    'error' in record ||
    Object.keys(record).every((key) => key === 'data' || key === 'warning')

  if (!isCanonicalEnvelope) return null

  if (record.error === null) return { data: record.data as T, error: null }

  if (!('error' in record)) {
    return {
      data: mergeWarning(record.data, record.warning) as T,
      error: null,
    }
  }

  return {
    data: null,
    error: normalizeError(record.error ?? FALLBACK_ERROR, options),
  }
}

function normalizeError(
  error: ErrorInput | unknown,
  options: { code?: string } = {}
): AppError {
  if (typeof error === 'string') {
    return {
      code: options.code ?? FALLBACK_ERROR.code,
      message: error,
    }
  }

  if (typeof error !== 'object' || error === null)
    return {
      code: options.code ?? FALLBACK_ERROR.code,
      message: FALLBACK_ERROR.message,
    }

  const record = error as Record<string, unknown>
  const code = typeof record.code === 'string' ? record.code : options.code
  const message =
    typeof record.message === 'string' ? record.message : FALLBACK_ERROR.message

  return {
    code: code ?? FALLBACK_ERROR.code,
    message,
  }
}

function mergeWarning(data: unknown, warning: unknown): unknown {
  if (typeof warning !== 'string') return data
  if (typeof data !== 'object' || data === null) return data
  if (Array.isArray(data)) return data

  return { ...data, warning }
}

function withoutCode(init: EnvelopeInit | undefined): ResponseInit | undefined {
  if (!init) return undefined
  const { code: _code, ...responseInit } = init

  return responseInit
}
