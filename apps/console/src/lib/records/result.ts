import type { Err, Ok } from '@/types/api'
import type { ConsoleErrorCode } from '@/lib/errors'
import { getError } from '@/lib/errors'

export function ok<T>(data: T, warning?: string): Ok<T> {
  return warning ? { data, error: null, warning } : { data, error: null }
}

export function err(error: string, status?: number): Err {
  return { data: null, error, status }
}

/** Build an Err from a registry code, using the canonical message and HTTP status. */
export function errFrom(code: ConsoleErrorCode): Err {
  const definition = getError(code)
  return {
    data: null,
    error: definition.message,
    status: definition.httpStatus,
    code,
  }
}
