import { apiJson } from '@876/core/api'
import { toWidgetsClientError } from '@/lib/errors'
import type { ServiceResult } from '@/lib/records/result'

export function serviceResponse<T>(result: ServiceResult<T>): Response {
  if (result.error)
    return apiJson(
      { data: null, error: toWidgetsClientError(result.error) },
      { status: result.error.httpStatus }
    )
  return apiJson({ data: result.data, error: null })
}
