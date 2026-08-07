/**
 * Provider-neutral contracts for authentication.
 *
 * Ported from `providers/protocol.py`. A module depends on these, never on a
 * WorkOS type, so replacing the provider stays a change under `providers/`.
 *
 * The three-way return is the important part of the design:
 *
 * - an {@link AuthSession} means authenticated;
 * - an {@link AuthEvent} means a **further step is required** — verify an email,
 *   answer an MFA challenge, pick an organization — which is not an error and
 *   must not be reported as one;
 * - an `AppHttpError` is thrown for a hard failure: wrong password, banned
 *   account, provider unreachable.
 *
 * Collapsing the middle case into the third is the mistake this shape exists to
 * prevent: a user who needs to verify their email would be told their password
 * was wrong.
 */

/** Provider-agnostic user, as returned by auth operations. */
export type ProviderUser = {
  id: string
  email: string
  firstName: string | null
  lastName: string | null
  emailVerified: boolean
  avatar: string | null
  metadata: Record<string, string>
}

/** Successful authentication — tokens plus the provider user. */
export type AuthSession = {
  accessToken: string
  refreshToken: string | null
  user: ProviderUser
  organizationId: string | null
}

/**
 * A step required before a session can be issued. Not an error.
 *
 * `kind` is the machine-readable step, passed through from the provider so a
 * new one the provider adds is surfaced rather than swallowed.
 */
export type AuthEvent = {
  kind: string
  email: string | null
  pendingToken: string | null
  organizations: Record<string, unknown>[]
  authFactors: Record<string, unknown>[]
  connectionIds: string[]
}

export function isAuthEvent(
  value: AuthSession | AuthEvent
): value is AuthEvent {
  return 'kind' in value
}

export function isAuthSession(
  value: AuthSession | AuthEvent
): value is AuthSession {
  return 'accessToken' in value
}
