/**
 * WorkOS-to-platform error normalization.
 *
 * A raw WorkOS error never crosses out of this directory. Every failure becomes
 * either an {@link AppHttpError} with a stable platform code, or — on the auth
 * endpoints — a {@link WorkOsHttpError} the auth adapter can inspect.
 */

import { AppHttpError } from '@/platform/errors'
import { getLogger } from '@/platform/logger'

const log = getLogger('workos')

/**
 * A non-2xx response from WorkOS, carrying enough of it to decide what happened.
 *
 * The auth endpoints are the reason this type exists. A 4xx from
 * `/user_management/authenticate` frequently carries **auth-flow data** rather
 * than a hard failure — a `pending_authentication_token` for an unverified
 * email, for instance — and normalizing it immediately would discard the token
 * the flow needs. So `postAuth` throws this, and the adapter reads the body
 * before deciding whether it is an event or an error.
 */
export class WorkOsHttpError extends Error {
  readonly status: number
  readonly body: Record<string, unknown>

  constructor(status: number, body: Record<string, unknown>) {
    super(`WorkOS responded ${status}`)
    this.name = 'WorkOsHttpError'
    this.status = status
    this.body = body
  }

  /** The WorkOS error code, from either field it may arrive in. */
  get code(): string {
    const code = this.body['code'] ?? this.body['error']
    return typeof code === 'string' ? code : ''
  }
}

export function isWorkOsHttpError(value: unknown): value is WorkOsHttpError {
  return value instanceof WorkOsHttpError
}

/**
 * WorkOS error code → [platform code, fallback HTTP status].
 *
 * The status here applies only to a code the shared error registry does not
 * carry: `AppHttpError` normalizes a registered code to the registry's status,
 * which is the platform's single source of truth for it.
 *
 * The "not found" codes stay deliberately vague as `auth/oauth-failed`: a
 * sign-in that answered `user/not-found` would confirm which addresses have
 * accounts. A caller that legitimately needs to know — password recovery — reads
 * {@link isWorkOsNotFound} instead of the status, because the registry pins
 * `auth/oauth-failed` at 401 and no 404 ever survives normalization.
 */
const CODE_MAP: ReadonlyMap<string, [string, number]> = new Map([
  ['email_address_conflict', ['auth/email-already-exists', 409]],
  ['email_verification_required', ['auth/email-not-verified', 403]],
  ['invalid_credentials', ['auth/invalid-credentials', 401]],
  ['password_reset_required', ['auth/invalid-credentials', 401]],
  ['account_selection_required', ['auth/oauth-failed', 401]],
  ['organization_not_found', ['auth/oauth-failed', 404]],
  ['membership_not_found', ['auth/oauth-failed', 404]],
  ['user_not_found', ['auth/oauth-failed', 404]],
  ['user_creation_error', ['auth/registration-failed', 400]],
  ['external_id_already_used', ['organization/provider-conflict', 409]],
])

/**
 * The user-facing message per platform code.
 *
 * Deliberately vague where the precise cause would be a disclosure: an
 * `invalid_credentials` and a `password_reset_required` both read as "the
 * sign-in information you entered is incorrect", so neither confirms that an
 * account exists.
 */
const SAFE_MESSAGE_BY_CODE: Readonly<Record<string, string>> = {
  'auth/email-already-exists':
    'An account with this email already exists. Sign in to continue.',
  'auth/invalid-credentials':
    'The sign-in information you entered is incorrect.',
  'auth/registration-failed':
    "We couldn't create your account. Please try again.",
  'organization/provider-conflict':
    "We couldn't complete organization setup. Please try again.",
}

/**
 * Normalize a WorkOS HTTP failure into a platform {@link AppHttpError}.
 *
 * An unmapped code becomes `auth/oauth-failed`, whose registered status (401)
 * wins over WorkOS's own. The upstream status is still logged, so an outage is
 * diagnosable even though the client is told only that authentication failed.
 */
export function normalizeWorkOsError(error: WorkOsHttpError): AppHttpError {
  const mapped = CODE_MAP.get(error.code)
  const [mappedCode, httpStatus] = mapped ?? [
    'auth/oauth-failed',
    error.status || 502,
  ]
  const message =
    SAFE_MESSAGE_BY_CODE[mappedCode] ?? 'Authentication provider error.'

  const upstreamMessage =
    error.body['message'] ?? error.body['error_description']

  log.warn(
    {
      upstream_code: error.code || null,
      upstream_status: error.status,
      mapped_code: mappedCode,
      http_status: httpStatus,
      // WorkOS's own message is provider-controlled prose about the request that
      // was made, not the credential in it, so it is safe to log — unlike a
      // Twilio validation message, which echoes request parameters.
      upstream_message:
        typeof upstreamMessage === 'string' ? upstreamMessage : null,
    },
    'workos.error_normalized'
  )

  // The raw WorkOS failure is carried as the cause: server-only (never part of
  // toClientError) and the only way a caller can tell the vague
  // `auth/oauth-failed` cases apart. See isWorkOsNotFound below.
  return new AppHttpError({
    code: mappedCode,
    message,
    httpStatus,
    cause: error,
  })
}

/** WorkOS codes that mean "the thing you named does not exist". */
const NOT_FOUND_UPSTREAM_CODES: ReadonlySet<string> = new Set([
  'organization_not_found',
  'membership_not_found',
  'user_not_found',
])

/**
 * Whether a normalized error came from a WorkOS "not found" failure.
 *
 * Reads the server-only cause rather than the HTTP status, which the shared
 * error registry pins to `auth/oauth-failed`'s 401. A caller must not infer
 * this from the client-facing code or status — both are deliberately vague so
 * an authentication response cannot be used to enumerate accounts.
 */
export function isWorkOsNotFound(error: unknown): boolean {
  if (!(error instanceof AppHttpError)) return false
  const cause = (error as { cause?: unknown }).cause
  return isWorkOsHttpError(cause) && NOT_FOUND_UPSTREAM_CODES.has(cause.code)
}
