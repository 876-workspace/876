"""Swagger descriptions and response schemas for the Auth domain."""

from __future__ import annotations

from fastapi import status

from core.responses import ErrorEnvelope

# ── /resolve ─────────────────────────────────────────────────────────────────

RESOLVE_EMAIL_DESCRIPTION = """\
Checks whether an email address or username exists on the platform and \
returns the account type.

Use this at the start of a progressive sign-in flow to decide which \
screen to show before the user enters a password. Calling this endpoint \
is optional — `POST /auth/login` works without it — but it lets you tailor \
the UI: show a password field immediately for known accounts, or redirect \
new users to registration. Returns `business: true` if the account is an \
organization member, `false` for individual accounts.

- Accepts a valid email address **or** a username (3–32 alphanumeric characters, dots, underscores, hyphens).
- Usernames are resolved to their associated email address before the check.
- Disposable and temporary email domains are blocked with `403`.
- Returns `404` for unknown identifiers — do not leak whether an email is registered \
  if your UX requires privacy; skip this endpoint and go directly to `POST /auth/login`.
"""

RESOLVE_EMAIL_RESPONSES: dict = {
    status.HTTP_400_BAD_REQUEST: {
        "model": ErrorEnvelope,
        "description": "Identifier is missing or not in a recognized format.",
    },
    status.HTTP_403_FORBIDDEN: {
        "model": ErrorEnvelope,
        "description": "Email domain is not permitted on this platform.",
    },
    status.HTTP_404_NOT_FOUND: {
        "model": ErrorEnvelope,
        "description": "No account found with this identifier.",
    },
}

# ── /login ───────────────────────────────────────────────────────────────────

LOGIN_DESCRIPTION = """\
Signs in a user with an email address (or username) and password.

On success, a signed `HttpOnly` session cookie is set on the response and a \
**session envelope** is returned:

```json
{
  "object": "session",
  "user": { "id": "usr_01...", "email": "user@example.com", "accountType": "consumer", ... },
  "sessionMeta": { "object": "session", "userId": "usr_01...", "expiresAt": null }
}
```

Store the `user` object on the client to avoid extra round-trips. The \
session cookie is read by `GET /auth/session` for server-side access checks.

If the account requires email verification before a full session can be \
issued, the response body is an **`auth_event`** instead:

```json
{
  "object": "auth_event",
  "type": "email_verification_required",
  "email": "user@example.com",
  "pendingAuthenticationToken": "pat_..."
}
```

Show the user a code-entry screen and call `POST /auth/verify-email` with \
the code they received and the `pendingAuthenticationToken` to complete sign-in.

- Accepts an email address or registered username as `identifier`.
- Repeated failures against the same account are rate-limited by the platform.
- Disposable email domains are blocked.
"""

LOGIN_RESPONSES: dict = {
    status.HTTP_401_UNAUTHORIZED: {
        "model": ErrorEnvelope,
        "description": "Email/username or password is incorrect.",
    },
    status.HTTP_403_FORBIDDEN: {
        "model": ErrorEnvelope,
        "description": "Account is suspended or email domain is not permitted.",
    },
}

# ── /oauth/session ───────────────────────────────────────────────────────────

OAUTH_SESSION_SUMMARY = "Establish a session from an OAuth id token"

OAUTH_SESSION_DESCRIPTION = """\
Converts an OIDC ID token issued by this server's `POST /oauth/token` endpoint \
into a first-party session cookie.

Internal apps such as Console use this after completing the central \
OAuth redirect flow. The endpoint remains behind the normal app API-key gate; \
when an app key resolves to an app, the ID token audience must match that app's \
OAuth `client_id`.
"""

OAUTH_SESSION_RESPONSES: dict = {
    status.HTTP_200_OK: {
        "description": "Session established; sets the session cookie.",
    },
    status.HTTP_401_UNAUTHORIZED: {
        "model": ErrorEnvelope,
        "description": "The id token is invalid or the account is unavailable.",
    },
    status.HTTP_403_FORBIDDEN: {
        "model": ErrorEnvelope,
        "description": "The id token was not issued to the calling app.",
    },
}

# ── /register ────────────────────────────────────────────────────────────────

REGISTER_DESCRIPTION = """\
Creates a new individual account and immediately signs the user in.

No separate login step is needed — a **session envelope** is returned \
directly (same shape as `POST /auth/login`). If the platform requires \
email verification before a session can be issued, an `auth_event` is \
returned instead. Show the user a code-entry screen and call \
`POST /auth/verify-email` to activate the account and sign them in.

New accounts are enrolled in the platform's default feature set \
automatically. The `accountType` will be `"consumer"` for accounts created \
through this endpoint. To create an organization owner account, use \
`POST /auth/register-business`.

- Password must be at least 8 characters.
- Disposable and temporary email domains are blocked.
- Duplicate email returns `409` — handle this by directing the user to sign in.
"""

REGISTER_RESPONSES: dict = {
    status.HTTP_409_CONFLICT: {
        "model": ErrorEnvelope,
        "description": "An account with this email address already exists.",
    },
    status.HTTP_403_FORBIDDEN: {
        "model": ErrorEnvelope,
        "description": "Email domain is not permitted on this platform.",
    },
    status.HTTP_400_BAD_REQUEST: {
        "model": ErrorEnvelope,
        "description": "A required field is missing or the password is too short.",
    },
}

# ── /register-business ───────────────────────────────────────────────────────

REGISTER_BUSINESS_DESCRIPTION = """\
Creates a new organization and an owner account in a single request.

The caller becomes the **owner** of the organization and is signed in \
immediately — a session envelope is returned (same shape as \
`POST /auth/login`). If email verification is required first, an \
`auth_event` is returned — complete verification via \
`POST /auth/verify-email`, after which the account and organization are \
both active. To invite additional members after registration, use the \
Organizations API.

The `accountType` for the owner will be `"enterprise"`. Organization \
memberships are accessible via `GET /auth/routing/memberships`, which \
your routing middleware can use to direct the user to the correct workspace.

**Organization slug**
- Optional; generated from the organization name when omitted.
- 3–64 characters, lowercase letters, numbers, and hyphens only.
- Must start and end with a letter or number (`[a-z0-9][a-z0-9-]*[a-z0-9]`).
- Globally unique and immutable after creation.

**Password requirements:** minimum 8 characters.

- Disposable email domains are blocked.
- Duplicate email or slug returns `409`.
"""

REGISTER_BUSINESS_RESPONSES: dict = {
    status.HTTP_409_CONFLICT: {
        "model": ErrorEnvelope,
        "description": "Email address or organization slug is already taken.",
    },
    status.HTTP_403_FORBIDDEN: {
        "model": ErrorEnvelope,
        "description": "Email domain is not permitted on this platform.",
    },
    status.HTTP_400_BAD_REQUEST: {
        "model": ErrorEnvelope,
        "description": "A required field is missing or a provided organization slug is invalid.",
    },
}

# ── /social-login ─────────────────────────────────────────────────────────────

SOCIAL_LOGIN_DESCRIPTION = """\
Returns an authorization URL to start an OAuth or SSO sign-in flow.

Redirect the user's browser to the returned `url`. After the user grants \
consent, the provider redirects back to your configured callback URI with a \
`code` parameter. Pass that code to `POST /auth/callback` to exchange it \
for a session.

This endpoint does not authenticate the user — it only generates the \
redirect URL. No session or cookie is set here.

**Supported providers:** `google`, `microsoft`, `github`, `gitlab`, \
`apple`, `linkedin`, `slack`, and any SSO \
connection configured on the account.

- `screenHint: "sign-up"` pre-selects the provider's registration tab, if supported by the provider.
- `loginHint` pre-fills the provider's email field — useful when you already know the user's address.
"""

SOCIAL_LOGIN_RESPONSES: dict = {
    status.HTTP_403_FORBIDDEN: {
        "model": ErrorEnvelope,
        "description": "The requested provider is disabled or unavailable.",
    },
    status.HTTP_500_INTERNAL_SERVER_ERROR: {
        "model": ErrorEnvelope,
        "description": "OAuth callback URI is not configured on the server.",
    },
}

# ── /magic-otp/send ───────────────────────────────────────────────────────────

MAGIC_OTP_SEND_DESCRIPTION = """\
Sends a one-time passcode to an email address for passwordless sign-in.

This is the first step of the magic-link / OTP authentication flow. After \
calling this endpoint, show the user a 6-digit code entry screen, then \
verify the code with `POST /auth/magic-otp/verify`. This flow works for \
both existing accounts and new users — an account is created automatically \
on first use if one does not already exist.

The response includes `canResendAt` — a Unix timestamp (seconds) indicating \
the earliest time another send is permitted. Display a countdown timer in \
your UI and re-enable the "Resend code" button only after this time has passed.

- Codes expire after **15 minutes**.
- Resend is rate-limited to once every **5 minutes** per address.
- Disposable and temporary email domains are blocked.
"""

MAGIC_OTP_SEND_RESPONSES: dict = {
    status.HTTP_429_TOO_MANY_REQUESTS: {
        "model": ErrorEnvelope,
        "description": "A code was sent recently. Check `canResendAt` from the previous response.",
    },
    status.HTTP_403_FORBIDDEN: {
        "model": ErrorEnvelope,
        "description": "Email domain is not permitted on this platform.",
    },
    status.HTTP_400_BAD_REQUEST: {
        "model": ErrorEnvelope,
        "description": "Email address is missing or invalid.",
    },
}

# ── /magic-otp/verify ─────────────────────────────────────────────────────────

MAGIC_OTP_VERIFY_DESCRIPTION = """\
Verifies a magic-auth OTP code and establishes an authenticated session.

Submit the 6-digit code the user received after calling \
`POST /auth/magic-otp/send`. On success, a signed session cookie is set \
on the response and the authenticated user object is returned. For new \
users, the account is created at this point — you do not need to call a \
registration endpoint separately.

- Codes are **single-use** — they are invalidated immediately after successful verification.
- Codes expire after **15 minutes** from the time they were sent.
- Request a new code with `POST /auth/magic-otp/send` after `canResendAt` has passed.
"""

MAGIC_OTP_VERIFY_RESPONSES: dict = {
    status.HTTP_401_UNAUTHORIZED: {
        "model": ErrorEnvelope,
        "description": "OTP code is incorrect or has expired.",
    },
    status.HTTP_400_BAD_REQUEST: {
        "model": ErrorEnvelope,
        "description": "Email address or code is missing.",
    },
}

# ── /recover ──────────────────────────────────────────────────────────────────

RECOVER_DESCRIPTION = """\
Sends a password reset link to an email address.

Always returns `200` regardless of whether the email is registered — this \
prevents attackers from using this endpoint to discover which addresses \
have accounts. Direct the user to check their inbox. The reset link contains \
a `token` query parameter; extract it and pass it to \
`POST /auth/reset-password` along with the new password.

Reset links expire after approximately **1 hour**. If the link expires, the \
user must request a new one by calling this endpoint again.

- Disposable and temporary email domains are blocked.
"""

RECOVER_RESPONSES: dict = {
    status.HTTP_403_FORBIDDEN: {
        "model": ErrorEnvelope,
        "description": "Email domain is not permitted on this platform.",
    },
    status.HTTP_400_BAD_REQUEST: {
        "model": ErrorEnvelope,
        "description": "Email address is missing or invalid.",
    },
}

# ── /reset-password ───────────────────────────────────────────────────────────

RESET_PASSWORD_DESCRIPTION = """\
Resets an account password using the token from a recovery email.

Extract the `token` from the reset link delivered by `POST /auth/recover` \
and submit it here with the new password. On success, the password is \
updated and the `email` of the affected account is returned. The existing \
session (if any) is not automatically invalidated — sign the user out \
explicitly if your security policy requires it, then redirect them to \
`POST /auth/login`.

- Password must be at least 8 characters.
- Tokens are **single-use** and expire after approximately 1 hour.
"""

RESET_PASSWORD_RESPONSES: dict = {
    status.HTTP_401_UNAUTHORIZED: {
        "model": ErrorEnvelope,
        "description": "Reset token is invalid, already used, or expired.",
    },
    status.HTTP_400_BAD_REQUEST: {
        "model": ErrorEnvelope,
        "description": "Token or password is missing, or the new password is too short.",
    },
}

# ── /verify-email ─────────────────────────────────────────────────────────────

VERIFY_EMAIL_DESCRIPTION = """\
Confirms an email address using a verification code sent during registration or sign-in.

When `POST /auth/register` or `POST /auth/login` returns an `auth_event` \
with `type: "email_verification_required"`, the user receives a 6-digit \
code by email. Submit that code here together with the \
`pendingAuthenticationToken` from the `auth_event` response. On success, \
the account is activated and the verified user object is returned.

The `pendingAuthenticationToken` ties the verification to the original \
sign-in or registration attempt — it is not the same as an access token \
and cannot be used to authenticate API requests. Store it only long enough \
to complete this verification step.

After a successful verification, redirect the user to sign in using \
`POST /auth/login` or display an appropriate success state.
"""

VERIFY_EMAIL_RESPONSES: dict = {
    status.HTTP_401_UNAUTHORIZED: {
        "model": ErrorEnvelope,
        "description": "Verification code is incorrect, expired, or the pending token is invalid.",
    },
    status.HTTP_403_FORBIDDEN: {
        "model": ErrorEnvelope,
        "description": "Email domain is not permitted on this platform.",
    },
    status.HTTP_400_BAD_REQUEST: {
        "model": ErrorEnvelope,
        "description": "Code or pending authentication token is missing.",
    },
}

# ── /callback (POST) ──────────────────────────────────────────────────────────

CALLBACK_DESCRIPTION = """\
Exchanges an OAuth authorization code for access and refresh tokens.

After the user completes the OAuth flow initiated by \
`POST /auth/social-login`, the provider redirects back to your callback \
URI with a `code` query parameter. Pass that code here to receive a \
session. A signed `HttpOnly` session cookie is set on the response.

**Response fields**
- `accessToken` — Short-lived JWT bearer token. Include this as \
  `Authorization: Bearer <token>` on authenticated API requests.
- `refreshToken` — Long-lived token. When the access token expires, \
  exchange it via `POST /auth/refresh` to get a new pair without \
  requiring the user to sign in again. Store this securely.
- `user` — The authenticated user object.

**PKCE:** Include `codeVerifier` if you used a PKCE code challenge during \
the authorization request. This is strongly recommended for flows initiated \
from a browser or mobile app.

**Invitations:** Include `invitationToken` to automatically accept an \
organization invitation as part of the sign-in.
"""

CALLBACK_RESPONSES: dict = {
    status.HTTP_401_UNAUTHORIZED: {
        "model": ErrorEnvelope,
        "description": "Authorization code is invalid, already used, or expired.",
    },
    status.HTTP_400_BAD_REQUEST: {
        "model": ErrorEnvelope,
        "description": "The `code` field is missing.",
    },
}

# ── /session ──────────────────────────────────────────────────────────────────

SESSION_DESCRIPTION = """\
Returns the current session payload decoded from the signed session cookie.

Use this in server-side code (e.g. middleware, server components, or API \
routes) to read the authenticated user's identity without a database query. \
The payload includes `userId`, `email`, `accountType`, `emailVerified`, \
`firstName`, `lastName`, and the `accessToken` embedded at sign-in time.

Returns `401` when no session cookie is present, when the cookie signature \
fails verification, or when the session has expired. On `401`, redirect the \
user to the sign-in page. To end a session explicitly, call \
`POST /auth/logout`.
"""

SESSION_RESPONSES: dict = {
    status.HTTP_401_UNAUTHORIZED: {
        "model": ErrorEnvelope,
        "description": "No session cookie found, or the session is invalid or expired.",
    },
}

# ── /refresh ──────────────────────────────────────────────────────────────────

REFRESH_DESCRIPTION = """\
Exchanges a refresh token for a new access token.

Access tokens are short-lived. When an API request returns `401`, check \
whether the access token has expired and, if so, call this endpoint with \
the stored refresh token to obtain a new pair without requiring the user \
to sign in again. If the refresh token itself is expired or invalid, \
redirect the user to sign in.

**Response fields**
- `accessToken` — New short-lived bearer token. Replace the old one.
- `refreshToken` — Rotated token. The previous refresh token is \
  immediately invalidated — store this new value securely.
- `user` — The authenticated user object, reflecting any account changes \
  since the last session.

Pass `organizationId` to scope the refreshed session to a specific \
organization the user is a member of. Omit it to get a user-scoped session.
"""

REFRESH_RESPONSES: dict = {
    status.HTTP_401_UNAUTHORIZED: {
        "model": ErrorEnvelope,
        "description": "Refresh token is invalid, expired, or has already been used.",
    },
    status.HTTP_400_BAD_REQUEST: {
        "model": ErrorEnvelope,
        "description": "Refresh token field is missing.",
    },
}

# ── /routing/memberships ──────────────────────────────────────────────────────

ROUTING_MEMBERSHIPS_DESCRIPTION = """\
Returns a user's organization memberships for server-side routing decisions.

This endpoint is designed for use in routing middleware and server-side \
request handlers. It returns each membership alongside the associated \
organization's `id`, `name`, `slug`, and `status`, so your middleware can \
route authenticated users to the correct workspace — individual (`/app`) \
or organization (`/org/{slug}`) — in a single request.

A user can belong to multiple organizations. If `orgSlug` is provided, \
results are filtered to that organization, which is useful for validating \
that a user has access to a specific workspace before rendering it.

- Call with `status=active` to exclude pending invitations from routing logic.
- This endpoint performs no authentication check of its own. Ensure it is \
  called only from trusted server-side code, not exposed directly to clients.

**Query parameters**
- `userId` *(required)* — Internal user ID to look up.
- `orgSlug` — Limit results to the organization with this slug.
- `status` — Filter by membership status: `active`, `invited`, or `suspended`.
"""

ROUTING_MEMBERSHIPS_RESPONSES: dict = {
    status.HTTP_400_BAD_REQUEST: {
        "model": ErrorEnvelope,
        "description": "`userId` query parameter is required.",
    },
}
