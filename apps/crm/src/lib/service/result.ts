export type ServiceError = { code: string; message: string }
export type ServiceResult<T> =
  | { data: T; error: null }
  | { data: null; error: ServiceError }

export function ok<T>(data: T): ServiceResult<T> {
  return { data, error: null }
}

export function fail<T = never>(code: string, message: string): ServiceResult<T> {
  return { data: null, error: { code, message } }
}
