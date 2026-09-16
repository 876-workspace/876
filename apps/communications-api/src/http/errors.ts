import type { HttpStatusCode } from '@876/core'

export const COMMUNICATIONS_ERRORS = {
  'communications/unauthorized': {
    message: 'Authentication is required.',
    httpStatus: 401 as HttpStatusCode,
  },
  'communications/domain-not-found': {
    message: 'The sending domain could not be found.',
    httpStatus: 404 as HttpStatusCode,
  },
  'communications/domain-already-exists': {
    message: 'This sending domain is already configured.',
    httpStatus: 409 as HttpStatusCode,
  },
  'communications/domain-not-verified': {
    message: 'Verify the sending domain before using it.',
    httpStatus: 409 as HttpStatusCode,
  },
  'communications/sender-not-found': {
    message: 'The sender identity could not be found.',
    httpStatus: 404 as HttpStatusCode,
  },
  'communications/sender-already-exists': {
    message: 'This sender identity is already configured.',
    httpStatus: 409 as HttpStatusCode,
  },
  'communications/sender-domain-not-verified': {
    message: 'The sender requires a verified sending domain.',
    httpStatus: 409 as HttpStatusCode,
  },
  'communications/template-not-found': {
    message: 'The email template could not be found.',
    httpStatus: 404 as HttpStatusCode,
  },
  'communications/template-render-failed': {
    message: 'The email template could not be rendered.',
    httpStatus: 422 as HttpStatusCode,
  },
  'communications/recipient-required': {
    message: 'At least one recipient is required.',
    httpStatus: 400 as HttpStatusCode,
  },
  'communications/recipient-invalid': {
    message: 'One or more email recipients are invalid.',
    httpStatus: 400 as HttpStatusCode,
  },
  'communications/delivery-not-found': {
    message: 'The email delivery could not be found.',
    httpStatus: 404 as HttpStatusCode,
  },
  'communications/idempotency-conflict': {
    message: 'This idempotency key was already used for a different delivery.',
    httpStatus: 409 as HttpStatusCode,
  },
  'communications/provider-unavailable': {
    message: 'Email delivery is temporarily unavailable.',
    httpStatus: 503 as HttpStatusCode,
  },
  'communications/provider-rejected': {
    message: 'The email provider rejected this request.',
    httpStatus: 502 as HttpStatusCode,
  },
  'communications/invalid-webhook': {
    message: 'The webhook signature is invalid.',
    httpStatus: 400 as HttpStatusCode,
  },
  'communications/invalid-request': {
    message: 'The request is invalid.',
    httpStatus: 400 as HttpStatusCode,
  },
  'communications/not-found': {
    message: 'Not found.',
    httpStatus: 404 as HttpStatusCode,
  },
} as const satisfies Record<
  string,
  { message: string; httpStatus: HttpStatusCode }
>

export type CommunicationsErrorCode = keyof typeof COMMUNICATIONS_ERRORS

export type CommunicationsError = {
  code: CommunicationsErrorCode
  message: string
  httpStatus: HttpStatusCode
  description?: string
  param?: string
}

export type ErrorOptions = {
  param?: string
  description?: string
}

export function getError(
  code: CommunicationsErrorCode,
  options?: ErrorOptions
): CommunicationsError {
  const definition = COMMUNICATIONS_ERRORS[code]
  return {
    code,
    message: definition.message,
    httpStatus: definition.httpStatus,
    ...(options?.param ? { param: options.param } : {}),
    ...(options?.description ? { description: options.description } : {}),
  }
}

export function communicationsError(
  code: CommunicationsErrorCode,
  options?: ErrorOptions
): CommunicationsError {
  return getError(code, options)
}

export function isCommunicationsError(
  value: unknown
): value is CommunicationsError {
  return (
    typeof value === 'object' &&
    value !== null &&
    'code' in value &&
    typeof (value as Record<string, unknown>).code === 'string' &&
    'message' in value &&
    typeof (value as Record<string, unknown>).message === 'string' &&
    'httpStatus' in value &&
    typeof (value as Record<string, unknown>).httpStatus === 'number'
  )
}
