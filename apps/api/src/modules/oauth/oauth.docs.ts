/**
 * OpenAPI prose for the OAuth module. Pure data — this file imports nothing,
 * which is what keeps route files readable and documentation reviewable on its
 * own (.claude/rules/express-api.md).
 */

export const OPENID_CONFIG_DESCRIPTION = `
Returns the OpenID Connect discovery document for this authorization server.

Clients can use this to auto-discover endpoint URLs, supported grant types,
scopes, and signing algorithms.

> See [OpenID Connect Discovery 1.0](https://openid.net/specs/openid-connect-discovery-1_0.html)
`

export const JWKS_DESCRIPTION = `
Returns the JSON Web Key Set (JWKS) used to verify ID tokens and access tokens
issued by this server.

Tokens are signed with RS256. Rotate \`OAUTH_PRIVATE_KEY\` and \`OAUTH_KEY_ID\` to
issue new keys; clients should re-fetch JWKS when encountering an unknown \`kid\`.
`

export const AUTHORIZE_DESCRIPTION = `
OAuth 2.0 Authorization endpoint (\`response_type=code\`).

* Validates the \`client_id\`, \`redirect_uri\`, and requested \`scope\`.
* If the user has already granted the requested scopes and \`prompt=consent\`
  is not set, issues an authorization code directly.
* Otherwise redirects to the consent UI at \`/oauth/consent\`.
* Supports PKCE (\`code_challenge\` + \`code_challenge_method=S256\`).
`

export const AUTHORIZE_RESPONSES = {
  400: {
    description:
      'Invalid request parameters (response_type, client_id, redirect_uri, or scope).',
  },
  401: {
    description:
      'Unknown client ID, unauthenticated user, or account selection required (`prompt=select_account`).',
  },
  403: {
    description:
      'Consent required but `prompt=none` was set, or consumer account required.',
  },
} as const

export const TOKEN_DESCRIPTION = `
OAuth 2.0 Token endpoint — exchanges an authorization code for tokens.

* \`grant_type\` must be \`authorization_code\`.
* PKCE verification is enforced when \`code_challenge\` was set at authorization time.
* Client authentication: \`Authorization: Basic <base64(clientId:secret)>\` or
  form-encoded \`client_id\` + \`client_secret\`.
* Returns an \`access_token\` (JWT, RS256) and optional \`id_token\` (OIDC).
`

export const TOKEN_RESPONSES = {
  400: {
    description: 'Invalid grant, code reuse, expired code, or PKCE mismatch.',
  },
  401: { description: 'Invalid client credentials.' },
} as const

export const USERINFO_DESCRIPTION = `
OIDC UserInfo endpoint. Returns claims about the authenticated user.

Requires a valid \`Bearer\` access token issued by this server.
Claims returned depend on the scopes granted at authorization time:
- \`openid\` → \`sub\`
- \`email\` → \`email\`, \`email_verified\`
- \`profile\` → \`name\`, \`given_name\`, \`family_name\`, \`picture\`
`

export const USERINFO_RESPONSES = {
  401: { description: 'Missing, invalid, or expired access token.' },
} as const

export const REVOKE_DESCRIPTION = `
Revokes an access token, invalidating the associated session.

Requires an API key in the \`Authorization: Bearer <api_key>\` header.
`

export const REVOKE_RESPONSES = {
  401: { description: 'Invalid or missing API key.' },
} as const

export const INTROSPECT_DESCRIPTION = `
RFC 7662 Token Introspection. Returns whether an access token is active and, when
active, its \`scope\`, \`client_id\`, \`sub\`, \`exp\`, and \`iat\`.

Protected: the calling resource server authenticates with its 876 API key in the
\`Authorization: Bearer <api_key>\` header.
`

export const CONSENT_GET_DESCRIPTION = `
Returns the data needed to render the consent UI: app details, user identity,
requested scopes, and previously granted scopes.
`

export const CONSENT_GET_RESPONSES = {
  400: { description: 'Invalid request parameters.' },
  401: { description: 'Unknown client or unauthenticated user.' },
} as const

export const CONSENT_APPROVE_DESCRIPTION = `
Records the user's consent decision and issues an authorization code.

Merges the newly approved scopes with any previously granted scopes,
then redirects the client to \`redirect_uri?code=<code>&state=<state>\`.
`

export const CONSENT_APPROVE_RESPONSES = {
  400: { description: 'Invalid request parameters.' },
  401: { description: 'Unknown client or unauthenticated user.' },
} as const

export const CONSENT_DENY_DESCRIPTION = `
Records a denied consent decision and redirects with \`error=access_denied\`.
`

export const CONSENT_DENY_RESPONSES = {
  400: { description: 'Invalid request parameters.' },
} as const
