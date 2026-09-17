# Foundation Reconnaissance — Projects Mobile

- Date: 2026-09-16
- Branch: `feature/projects-mobile`
- Scope owner: GPT-web/orchestrator
- Status: implementation prerequisites verified; security/API/SDK foundation in progress

## Current docs verification

Official sources re-checked immediately before implementation:

- Expo AuthSession: https://docs.expo.dev/versions/latest/sdk/auth-session/
- Expo authentication guide: https://docs.expo.dev/guides/authentication/
- Expo linking into an app: https://docs.expo.dev/linking/into-your-app/
- Expo linking overview: https://docs.expo.dev/linking/overview/
- Expo app config scheme reference: https://docs.expo.dev/versions/latest/config/app/
- RFC 8252, OAuth 2.0 for Native Apps: https://datatracker.ietf.org/doc/html/rfc8252

Current decision: Projects Mobile is a public OAuth client using Authorization Code + S256 PKCE in a development/standalone build, not Expo Go. A stable native redirect must be configured in the native app. The repository's Core redirect validator must therefore support a registered private-use native URI scheme for public clients without weakening confidential/web-client redirect validation.

## Verified repository findings

### 1. One branch only

The user's current instruction supersedes the older multi-phase branch examples. All work remains on:

```text
feature/projects-mobile
```

See `02-single-branch-execution.md`.

### 2. Core OAuth already has the important native primitives

Core already supports:

- authorization code flow;
- mandatory S256 PKCE storage/exchange;
- public clients with no client secret;
- access tokens;
- `offline_access` refresh tokens;
- refresh-token rotation/reuse detection;
- token revocation/introspection;
- RS256/JWKS.

The token endpoint does not need a mobile-only authentication scheme.

### 3. Current Core redirect validation blocks native schemes

Both registered-app creation and OAuth authorization currently accept only:

- `https:` redirects; or
- `http:` loopback redirects.

A native callback such as `com.efestojm.projects://oauth/callback` is therefore rejected even when exactly registered. This is the first platform prerequisite to fix.

Correct constraint: exact redirect allowlist matching remains mandatory; private-use URI schemes are accepted only for public clients, while confidential clients retain HTTPS/loopback-only behavior. The native scheme should use reverse-domain style to reduce collision risk.

### 4. Native authorization must still use the browser/session UI

`GET /oauth/authorize` deliberately accepts the acting user only from the trusted first-party server/session bridge. A bearer token cannot substitute for that trusted browser authorization context. This is correct: allowing an access token holder to drive consent/authorization would weaken the consent boundary.

Projects Mobile should therefore open the existing 876 browser authorization surface with AuthSession/WebBrowser. It should not invent a direct credential form or call the protected authorization controller as an API from the APK.

### 5. Organization identity is bound into OAuth tokens

Core token issuance derives:

```text
orgId present -> realm=enterprise + org_id claim
orgId absent  -> realm=consumer, no org_id
```

Therefore the earlier idea of minting one unbound token and freely switching organizations later is not valid for the current token model. Organization switching in the native client must either re-authorize for the selected organization or be supported by an explicit future Core token-exchange/session contract. Do not fake org switching by sending an arbitrary organization header.

### 6. Projects access control already has the canonical self-access algorithm

The Projects web app resolves access through Core using the acting user's bearer token:

1. resolve the environment-specific `876-projects` app id from the org entitlement;
2. call `account.appMemberships.me.retrieve({ organizationId, appId })`;
3. require active + assigned + entitled + not revoked;
4. consume `entitled_modules` and `effective_permissions`.

That is the algorithm the Projects API session tier should preserve. The product datastore must not own mobile roles/users/permissions.

### 7. Permission vocabulary is already canonical

`projectsPermissionCatalog` already declares:

- `projects.view/create/edit/delete/archive`;
- `issues.view/create/edit/delete`;
- `comments.view/create/edit/delete`;
- labels, members, reports, settings, dashboard.

Do not invent mobile-specific permission names.

### 8. Projects SDK is blocked by transport, not resource definitions

Most `@876/projects` resources are already reusable and construct the existing `/v1/organizations/...` paths. The blockers are:

- `client.ts` imports `server-only`;
- runtime exposes only `internalKey`;
- request transport requires `internalKey` and always sends `x-internal-key`.

The scalable seam is an authority-aware runtime/transport plus a native-safe client assembly. Do not clone Issues/Comments/Projects resources for mobile.

### 9. Same resource paths can support multiple principals

A separate duplicate `/v1/session/...` business route tree is not required. Existing `/v1/organizations/...` endpoints can keep one controller/service implementation while selected v1 routes accept either:

- valid internal authority; or
- validated signed-in session authority with exact permission/module checks.

Routes not needed by mobile remain internal-only until deliberately opened. This minimizes drift and keeps business behavior single-owner.

### 10. Existing Couriers bearer verification is the strongest current precedent

Couriers verifies RS256 using Core JWKS, validates access-token purpose/audience/issuer semantics, and introspects tokens so revoked/signed-out sessions do not remain accepted until `exp`. Projects should reuse/promote that behavior rather than implement a weaker signature-only verifier.

## Foundation implementation order

1. Fix native public-client redirect validation in Core with focused tests.
2. Add Projects API bearer/session principal and Core access resolver.
3. Open only the minimum Projects/Issues/Comments/Notifications/My Work routes with exact permission checks; leave unrelated routes internal-only.
4. Make `@876/projects` transport authority-aware and add `@876/projects/session` without resource duplication.
5. Hand the stable contracts to Muse/Codex for Expo scaffold/UI/auth-shell work.

## Explicitly deferred to the local Muse/Codex implementation

- creating `apps/projects-mobile`;
- Expo app config/package identifier/scheme finalization;
- SecureStore token persistence;
- AuthSession UI lifecycle;
- native navigation/screens;
- TanStack Query/native lifecycle wiring;
- EAS build configuration.

Those phases must re-check current official documentation again when executed.
