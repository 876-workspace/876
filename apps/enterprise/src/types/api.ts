import type { ApiResult, AppError } from '@876/core'

export type Ok<T> = { data: T; error: null }
export type Err = { data: null; error: AppError }

/** Result envelope returned by the typed browser mutation client. */
export type ClientResult<T> = ApiResult<T, AppError>
