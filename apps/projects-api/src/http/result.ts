import type { Response } from 'express'

import {
  getError,
  isProjectsError,
  type ProjectsError,
  type ProjectsErrorCode,
} from './errors.js'

export type ServiceResult<T> =
  { data: T; error: null } | { data: null; error: ProjectsError }

export type ListPayload<T> = {
  items: T[]
  hasMore: boolean
  totalCount?: number | null
}

export function toClientError(error: ProjectsError) {
  return {
    code: error.code,
    message: error.message,
  }
}

/** Sends a registered application error without duplicating code/message/status. */
export function sendProjectsError(res: Response, code: ProjectsErrorCode) {
  const error = getError(code)
  return res.status(error.httpStatus).json({
    data: null,
    error: toClientError(error),
  })
}

/**
 * Sends a service result while keeping expected failures as values.
 * Unexpected exceptions are deliberately not caught here; Express middleware
 * remains the final safety boundary for those.
 */
export function sendProjectsResult<T>(
  res: Response,
  result: ServiceResult<T> | ProjectsError | T,
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
    return res.status(successStatus).json({
      data: serviceResult.data,
      error: null,
    })
  }

  if (isProjectsError(result)) {
    return res.status(result.httpStatus).json({
      data: null,
      error: toClientError(result),
    })
  }

  return res.status(successStatus).json({ data: result, error: null })
}

/**
 * Sends a collection service result as the platform list object.
 */
export function sendProjectsList<T>(
  res: Response,
  result:
    ServiceResult<ListPayload<T> | T[]> | ListPayload<T> | T[] | ProjectsError,
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
    const inner = serviceResult.data
    if (Array.isArray(inner)) {
      return res.json({
        data: {
          object: 'list',
          data: inner,
          has_more: false,
          total_count: inner.length,
          url,
        },
        error: null,
      })
    }
    return res.json({
      data: {
        object: 'list',
        data: inner.items,
        has_more: inner.hasMore,
        total_count: inner.totalCount ?? null,
        url,
      },
      error: null,
    })
  }

  if (isProjectsError(result)) {
    return res.status(result.httpStatus).json({
      data: null,
      error: toClientError(result),
    })
  }

  if (Array.isArray(result)) {
    return res.json({
      data: {
        object: 'list',
        data: result,
        has_more: false,
        total_count: result.length,
        url,
      },
      error: null,
    })
  }

  const payload = result as ListPayload<T>
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

// Aliases matching platform conventions
export const sendError = sendProjectsError
export const sendResult = sendProjectsResult
export const sendList = sendProjectsList
