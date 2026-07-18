import type { ApiResult, AppError } from '@876/core'

export type ServiceOk<T> = {
  data: T
  error: null
  warning?: string
}

export type ServiceErr = {
  data: null
  error: string
  status?: number
  code?: string
}

/** Result envelope returned by every `service.<resource>.<verb>()` operation. */
export type ServiceResult<T> = Promise<ServiceOk<T> | ServiceErr>

/** Result envelope returned by browser Billing API transports. */
export type ClientResult<T> = ApiResult<T, AppError>
