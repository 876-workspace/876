/**
 * Mapping 876 error codes onto the RFC 6749 / OIDC error codes the OAuth
 * endpoints answer with.
 *
 * The two vocabularies are deliberately separate: internal codes are specific
 * enough to debug from (`provider/invalid-code-verifier`), while the wire code
 * is the small closed set a client is allowed to branch on. Anything
 * unrecognised degrades to `invalid_request` rather than leaking the internal
 * code to the caller.
 */

export const OAUTH_ERROR_CODES: Record<string, string> = {
  'provider/access-denied': 'access_denied',
  'provider/consumer-account-required': 'access_denied',
  'provider/code-expired': 'invalid_grant',
  'provider/code-not-found': 'invalid_grant',
  'provider/code-used': 'invalid_grant',
  'provider/invalid-code-verifier': 'invalid_grant',
  'provider/consent-required': 'consent_required',
  'provider/invalid-client': 'invalid_client',
  'provider/invalid-client-secret': 'invalid_client',
  'provider/invalid-redirect-uri': 'invalid_redirect_uri',
  'provider/invalid-scope': 'invalid_scope',
  'provider/login-required': 'login_required',
  'provider/token-expired': 'invalid_token',
  'provider/token-invalid': 'invalid_token',
  'provider/unauthorized-client': 'unauthorized_client',
  'provider/unsupported-grant-type': 'unsupported_grant_type',
  'provider/unsupported-response-type': 'unsupported_response_type',
  'provider/internal-error': 'server_error',
}

export function toOAuthErrorCode(code: string): string {
  return OAUTH_ERROR_CODES[code] ?? 'invalid_request'
}

/**
 * The RFC-shaped error body, thrown as a value the controller returns.
 *
 * Carried as a plain object with its own status rather than an `AppHttpError`,
 * because these responses use the OAuth error shape
 * (`{ error, error_description }`) rather than the platform's error contract.
 */
export class OAuthErrorResponse {
  readonly status: number
  readonly body: { error: string; error_description: string }

  constructor(code: string, message: string, status: number) {
    this.status = status
    this.body = { error: toOAuthErrorCode(code), error_description: message }
  }
}

export function oauthError(
  code: string,
  message: string,
  status: number
): OAuthErrorResponse {
  return new OAuthErrorResponse(code, message, status)
}
