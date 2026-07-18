"""Rich Swagger descriptions and response maps for the OAuth domain."""

from __future__ import annotations

from fastapi import status

from core.responses import ErrorEnvelope

OPENID_CONFIG_DESCRIPTION = """
Returns the OpenID Connect discovery document for this authorization server.

Clients can use this to auto-discover endpoint URLs, supported grant types,
scopes, and signing algorithms.

> See [OpenID Connect Discovery 1.0](https://openid.net/specs/openid-connect-discovery-1_0.html)
"""

JWKS_DESCRIPTION = """
Returns the JSON Web Key Set (JWKS) used to verify ID tokens and access tokens
issued by this server.

Tokens are signed with RS256. Rotate `OAUTH_PRIVATE_KEY` and `OAUTH_KEY_ID` to
issue new keys; clients should re-fetch JWKS when encountering an unknown `kid`.
"""

AUTHORIZE_DESCRIPTION = """
OAuth 2.0 Authorization endpoint (`response_type=code`).

* Validates the `client_id`, `redirect_uri`, and requested `scope`.
* If the user has already granted the requested scopes and `prompt=consent`
  is not set, issues an authorization code directly.
* Otherwise redirects to the consent UI at `/oauth/consent`.
* Supports PKCE (`code_challenge` + `code_challenge_method=S256`).
"""

AUTHORIZE_RESPONSES: dict = {
    status.HTTP_400_BAD_REQUEST: {
        "model": ErrorEnvelope,
        "description": "Invalid request parameters (response_type, client_id, redirect_uri, or scope).",
    },
    status.HTTP_401_UNAUTHORIZED: {
        "model": ErrorEnvelope,
        "description": (
            "Unknown client ID, unauthenticated user, or account selection required (`prompt=select_account`)."
        ),
    },
    status.HTTP_403_FORBIDDEN: {
        "model": ErrorEnvelope,
        "description": "Consent required but `prompt=none` was set, or consumer account required.",
    },
}

TOKEN_DESCRIPTION = """
OAuth 2.0 Token endpoint — exchanges an authorization code for tokens.

* `grant_type` must be `authorization_code`.
* PKCE verification is enforced when `code_challenge` was set at authorization time.
* Client authentication: `Authorization: Basic <base64(clientId:secret)>` or
  form-encoded `client_id` + `client_secret`.
* Returns an `access_token` (JWT, RS256) and optional `id_token` (OIDC).
"""

TOKEN_RESPONSES: dict = {
    status.HTTP_400_BAD_REQUEST: {
        "description": "Invalid grant, code reuse, expired code, or PKCE mismatch.",
    },
    status.HTTP_401_UNAUTHORIZED: {
        "description": "Invalid client credentials.",
    },
}

USERINFO_DESCRIPTION = """
OIDC UserInfo endpoint. Returns claims about the authenticated user.

Requires a valid `Bearer` access token issued by this server.
Claims returned depend on the scopes granted at authorization time:
- `openid` → `sub`
- `email` → `email`, `email_verified`
- `profile` → `name`, `given_name`, `family_name`, `picture`
"""

USERINFO_RESPONSES: dict = {
    status.HTTP_401_UNAUTHORIZED: {
        "description": "Missing, invalid, or expired access token.",
    },
}

REVOKE_DESCRIPTION = """
Revokes an access token, invalidating the associated session.

Requires an API key in the `Authorization: Bearer <api_key>` header.
"""

REVOKE_RESPONSES: dict = {
    status.HTTP_401_UNAUTHORIZED: {
        "model": ErrorEnvelope,
        "description": "Invalid or missing API key.",
    },
}

INTROSPECT_DESCRIPTION = """
RFC 7662 Token Introspection. Returns whether an access token is active and, when
active, its `scope`, `client_id`, `sub`, `exp`, and `iat`.

Protected: the calling resource server authenticates with its 876 API key in the
`Authorization: Bearer <api_key>` header.
"""

CONSENT_GET_DESCRIPTION = """
Returns the data needed to render the consent UI: app details, user identity,
requested scopes, and previously granted scopes.
"""

CONSENT_GET_RESPONSES: dict = {
    status.HTTP_400_BAD_REQUEST: {
        "model": ErrorEnvelope,
        "description": "Invalid request parameters.",
    },
    status.HTTP_401_UNAUTHORIZED: {
        "model": ErrorEnvelope,
        "description": "Unknown client or unauthenticated user.",
    },
}

CONSENT_APPROVE_DESCRIPTION = """
Records the user's consent decision and issues an authorization code.

Merges the newly approved scopes with any previously granted scopes,
then redirects the client to `redirect_uri?code=<code>&state=<state>`.
"""

CONSENT_APPROVE_RESPONSES: dict = {
    status.HTTP_400_BAD_REQUEST: {
        "model": ErrorEnvelope,
        "description": "Invalid request parameters.",
    },
    status.HTTP_401_UNAUTHORIZED: {
        "model": ErrorEnvelope,
        "description": "Unknown client or unauthenticated user.",
    },
}

CONSENT_DENY_DESCRIPTION = """
Records a denied consent decision and redirects with `error=access_denied`.
"""

CONSENT_DENY_RESPONSES: dict = {
    status.HTTP_400_BAD_REQUEST: {
        "model": ErrorEnvelope,
        "description": "Invalid request parameters.",
    },
}
