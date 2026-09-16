import type { Response } from 'express'

import {
  getError,
  isCommunicationsError,
  type CommunicationsError,
  type CommunicationsErrorCode,
} from './errors.js'

export type ServiceResult<T> =
  | { data: T; error: null }
  | { data: null; error: CommunicationsError }

export type ListPayload<T> = {
  items: T[]
  hasMore: boolean
  totalCount?: number | null
}

export function ok<T>(data: T): ServiceResult<T> {
  return { data, error: null }
}

export function err<T = never>(
  code: CommunicationsErrorCode,
  options?: { param?: string; description?: string }
): ServiceResult<T> {
  return { data: null, error: getError(code, options) }
}

export function toClientError(error: CommunicationsError) {
  return { code: error.code, message: error.message }
}

export function sendCommunicationsError(
  res: Response,
  code: CommunicationsErrorCode
) {
  const error = getError(code)
  return res.status(error.httpStatus).json({
    data: null,
    error: toClientError(error),
  })
}

export function sendCommunicationsResult<T>(
  res: Response,
  result: ServiceResult<T> | CommunicationsError | T,
  successStatus = 200
) {
  if (
    result &&
    typeof result === 'object' &&
    'data' in result &&
    'error' in result
  ) {
    const serviceResult = result as ServiceResult<T>
    if (serviceResult.error !== null) {
      return res.status(serviceResult.error.httpStatus).json({
        data: null,
        error: toClientError(serviceResult.error),
      })
    }
    return res.status(successStatus).json({ data: serviceResult.data, error: null })
  }

  if (isCommunicationsError(result)) {
    return res.status(result.httpStatus).json({
      data: null,
      error: toClientError(result),
    })
  }

  return res.status(successStatus).json({ data: result, error: null })
}

export function sendCommunicationsList<T>(
  res: Response,
  result:
    | ServiceResult<ListPayload<T> | T[]>
    | ListPayload<T>
    | T[]
    | CommunicationsError,
  url: string
) {
  if (
    result &&
    typeof result === 'object' &&
    'data' in result &&
    'error' in result
  ) {
    const serviceResult = result as ServiceResult<ListPayload<T> | T[]>
    if (serviceResult.error !== null) {
      return res.status(serviceResult.error.httpStatus).json({
        data: null,
        error: toClientError(serviceResult.error),
      })
    }
    return sendCommunicationsList(res, serviceResult.data, url)
  }

  if (isCommunicationsError(result)) {
    return res.status(result.httpStatus).json({
      data: null,
      error: toClientError(result),
    })
  }

  const payload = Array.isArray(result)
    ? { items: result, hasMore: false, totalCount: result.length }
    : result

  return res.json({
    data: {
      object: 'list',
      data: payload.items,
      has_more: payload.hasMore,
      total_count: payload.totalCount ?? null,
      url,
    },
    error: null,
  })
}

export const sendError = sendCommunicationsError
export const sendResult = sendCommunicationsResult
export const sendList = sendCommunicationsList
