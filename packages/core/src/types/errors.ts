export const HttpStatus = {
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
} as const

export type HttpStatusCode = (typeof HttpStatus)[keyof typeof HttpStatus]

export type ErrorDef = {
  message: string
  httpStatus: HttpStatusCode
  description?: string
}

/**
 * Client-safe error shape returned by API route handlers.
 * HTTP status is set on the response, not included in the body.
 */
export interface AppError<Code extends string = string> {
  /**
   * Stable app-owned error code.
   */
  code: Code
  /**
   * Human-readable error message.
   */
  message: string
}

/**
 * Server-side error shape that includes the HTTP status code for route
 * handlers to extract before returning a client-safe response.
 */
export interface Error<Code extends string = string> extends AppError<Code> {
  /**
   * Additional server-side context for the error.
   */
  description?: string
  /**
   * Parameter that caused the error, if applicable.
   */
  param?: string
  /**
   * HTTP status code used for the response status, never client JSON.
   */
  httpStatus: HttpStatusCode
}
