/**
 * Central Twilio-to-platform error normalization with safe structured logs.
 *
 * Every error that escapes a Twilio HTTP call is normalized here into an
 * {@link AppHttpError} with a stable code and a user-safe message. Raw vendor
 * messages, stacks, and payloads never cross out of this file.
 */

import { AppHttpError } from '@/platform/errors'
import { getLogger, getRequestId } from '@/platform/logger'

import { twilioErrorDetails } from './types'

const log = getLogger('twilio')

/**
 * Maps Twilio error codes to [appCode, httpStatus, userSafeMessage].
 *
 * Codes documented at https://www.twilio.com/docs/api/errors.
 */
const CODE_MAP: ReadonlyMap<string, [string, number, string]> = new Map([
  ['20429', ['communications/rate-limited', 429, 'Please wait and try again.']],
  [
    '60200',
    [
      'communications/verification-failed',
      400,
      'The verification could not be completed.',
    ],
  ],
  [
    '60202',
    [
      'communications/max-attempts-reached',
      429,
      'Too many verification attempts.',
    ],
  ],
  ['60203', ['communications/rate-limited', 429, 'Please wait and try again.']],
  [
    '60205',
    [
      'communications/verification-expired',
      400,
      'The verification has expired.',
    ],
  ],
  [
    '60212',
    ['communications/invalid-phone-number', 400, 'Enter a valid phone number.'],
  ],
])

/**
 * Return a minimally useful, non-reversible display for a phone number.
 *
 * The last four digits are enough to correlate a support report with a log
 * line, and are not a reversible identifier on their own.
 */
export function maskPhoneNumber(
  value: string | null | undefined
): string | null {
  if (!value) return null
  const digits = value.replace(/\D/g, '')
  if (digits.length <= 4) return '****'
  return `+***${digits.slice(-4)}`
}

export function notConfigured(): AppHttpError {
  return new AppHttpError({
    code: 'communications/not-configured',
    message: 'Phone verification is not configured.',
    httpStatus: 503,
  })
}

export function channelDisabled(channel: string): AppHttpError {
  return new AppHttpError({
    code: 'communications/channel-disabled',
    message: `The ${channel} verification channel is disabled.`,
    httpStatus: 403,
  })
}

/**
 * Normalize an HTTP error from the Twilio API into a platform {@link AppHttpError}.
 *
 * Logs the Twilio error code, upstream HTTP status, and message _length_ (never
 * the text — Twilio validation messages echo request parameters, including the
 * full destination number).
 */
export function normalizeTwilioError(
  response: { status: number; body: unknown },
  opts: { context?: Record<string, unknown> } = {}
): AppHttpError {
  const [providerCode, resourceSid, upstreamMessage] = twilioErrorDetails(
    response.body
  )

  let mapped = CODE_MAP.get(providerCode)
  if (!mapped) {
    if (response.status === 404) {
      mapped = [
        'communications/verification-failed',
        400,
        'The verification was not found.',
      ]
    } else if (response.status === 429) {
      mapped = [
        'communications/rate-limited',
        429,
        'Please wait and try again.',
      ]
    } else {
      mapped = [
        'communications/provider-unavailable',
        503,
        'The communications provider is temporarily unavailable.',
      ]
    }
  }

  const [mappedCode, httpStatus, message] = mapped
  const safeContext = opts.context ?? {}
  const correlationId = getRequestId() || null

  log.warn(
    {
      upstream_code: providerCode || null,
      upstream_status: response.status,
      resource_sid: resourceSid,
      correlation_id: correlationId,
      mapped_code: mappedCode,
      // The upstream text is provider-controlled and Twilio validation messages
      // echo request parameters, including the full destination number — logging
      // it verbatim defeats the masked `to` context sitting beside it. Length is
      // enough to tell a truncated payload from an empty one.
      upstream_message_length: upstreamMessage ? upstreamMessage.length : 0,
      ...safeContext,
    },
    'twilio.error_normalized'
  )

  return new AppHttpError({ code: mappedCode, message, httpStatus })
}

/**
 * Normalize a network-level error (connection refused, timeout, etc.) into a
 * platform {@link AppHttpError}.
 */
export function providerUnavailable(
  error: unknown,
  opts: { context?: Record<string, unknown> } = {}
): AppHttpError {
  const correlationId = getRequestId() || null
  log.warn(
    {
      correlation_id: correlationId,
      error_type:
        error instanceof Error ? error.constructor.name : typeof error,
      ...(opts.context ?? {}),
    },
    'twilio.request_error'
  )
  return new AppHttpError({
    code: 'communications/provider-unavailable',
    message: 'The communications provider is temporarily unavailable.',
    httpStatus: 503,
  })
}
