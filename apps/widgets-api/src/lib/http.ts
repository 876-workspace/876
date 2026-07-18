import { apiError, apiJson } from '@876/core/api'
import type { ServiceResult } from '@/lib/service/result'

export function serviceResponse<T>(result: ServiceResult<T>): Response {
  if (result.error)
    return apiError(result.error, {
      status: result.status,
      code: result.code,
    })
  return apiJson({ data: result.data, error: null })
}
