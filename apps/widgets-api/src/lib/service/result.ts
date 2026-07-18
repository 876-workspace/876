export type ServiceOk<T> = { data: T; error: null }
export type ServiceErr = {
  data: null
  error: string
  status: number
  code?: string
}
export type ServiceResult<T> = ServiceOk<T> | ServiceErr

export function ok<T>(data: T): ServiceOk<T> {
  return { data, error: null }
}

export function err(error: string, status = 400, code?: string): ServiceErr {
  return { data: null, error, status, code }
}
