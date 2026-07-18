import type { Ok, Err } from '@/types/api'

import { getError, type CouriersErrorCode } from '@/lib/errors'

export function ok<T>(data: T): Ok<T> {
  return { data, error: null }
}

export function err(error: string, status: number): Err {
  return { data: null, error, status }
}

export function errFrom(code: CouriersErrorCode): Err {
  const definition = getError(code)
  return {
    data: null,
    error: definition.message,
    status: definition.httpStatus,
    code,
  }
}
