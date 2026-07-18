import type { ApiResult, AppError } from '@876/core'

export type Ok<T> = { data: T; error: null }
export type Err = { data: null; error: string; status: number; code?: string }
export type ServiceResult<T> = Promise<Ok<T> | Err>

export type ClientResult<T> = ApiResult<T, AppError>
