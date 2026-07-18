import type { ApiResult, AppError } from '@876/core'

/** Result envelope returned by every `service.<resource>.<verb>()` mutation. */
export type Ok<T> = { data: T; error: null; warning?: string }
export type Err = { data: null; error: string; status?: number; code?: string }
export type ServiceResult<T> = Promise<Ok<T> | Err>

/** Result envelope returned by the browser `client.<resource>.<verb>()` transport. */
export type ClientResult<T> = ApiResult<T, AppError>
