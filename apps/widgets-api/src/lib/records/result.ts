import {
  getWidgetsError,
  type WidgetsError,
  type WidgetsErrorCode,
} from '../errors'

export type ServiceOk<T> = { data: T; error: null }
export type ServiceErr = { data: null; error: WidgetsError }
export type ServiceResult<T> = ServiceOk<T> | ServiceErr

export function ok<T>(data: T): ServiceOk<T> {
  return { data, error: null }
}

export function err(code: WidgetsErrorCode): ServiceErr {
  return { data: null, error: getWidgetsError(code) }
}
