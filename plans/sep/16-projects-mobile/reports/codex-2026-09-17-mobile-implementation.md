# Projects Mobile implementation report (Codex, 2026-09-17)

- Branch: `feature/projects-mobile` (single-branch rule honored; no phase
  branches created).
- Scope: session-tier verification, Expo scaffold + v1 screens, native auth
  design correction, first-party authorize proxy, native OAuth client seed.

## Current docs verification (checked 2026-09-17)

- Selected SDK: Expo SDK 57 stable (`expo ~57.0.23`, `expo-router ~57.0.21`).
- React Native 0.86.3 / React 19.2.3 / react-dom 19.2.3 (per-SDK versions
  installed via `expo install`, not guessed).
- `expo-doctor`: **21/21 checks pass**.
- Official docs consulted: SDK matrix (`docs.expo.dev/versions/latest/`),
  monorepo guide (no custom Metro config — bundle exports clean without it),
  development-builds + dev-client (ships as dev build, not Expo Go), New
  Architecture (no `newArchEnabled` switch added), expo-auth-session /
  expo-web-browser / expo-secure-store API verified against installed `.d.ts`
  (`getAuthRequestConfigAsync`, `openAuthSessionAsync`,
  `maybeCompleteAuthSession`), TanStack Query v5 `onlineManager`
  (`setEventListener` returns void) + NetInfo listener pattern.
- Deprecated/stale patterns avoided: no `expo-cli`, no Expo Go workflow, no
  legacy-architecture toggle, no hand-written Metro monorepo config, no
  `SafeAreaView` from core (uses `react-native-safe-area-context`), no
  AsyncStorage for tokens, no localhost API fallback.
- Repo conflicts resolved: root React is 19.2.8 while SDK 57 pins 19.2.3 —
  resolved per-app (mobile pins 19.2.3; install + doctor + Metro export show
  no resolution conflict). Root TypeScript stays 5.9.3 (SDK suggests ~6.0.3);
  recorded via `expo.install.exclude: ["typescript"]` — app typechecks clean.
  Placeholder icon PNGs are generated solids; replace with real 876 branding
  before store release.

## Phase 0 correction: Core authorize is proxy-only

`GET /oauth/authorize` requires the internal key plus an asserted user
(`requireCurrentUser`: `hasTrustedInternalKey` + `X-User-Id`), so a mobile
system-browser flow cannot drive it directly. The plan's "browser to Core
authorize" premise was false. Implemented instead:

- `apps/enterprise/src/app/api/oauth/native-authorize/route.ts` — transport-only
  proxy: requires the Enterprise session, allowlists the registered native
  client/redirect, verifies active org membership for `org_id`, calls Core
  authorize server-side, 302s to Core's `redirectTo` (native-scheme code URL).
- Mobile exchanges the code at Core `/oauth/token` as a public client with its
  PKCE verifier (`S256`), refreshes via `offline_access` rotation, discovers
  orgs via Core `GET /me/memberships`, user id via `/oauth/userinfo`.
- `apps/api/src/seeds/native-apps.ts` — idempotent seed registering
  `876-projects-mobile` (`clientType: public`, no secret, `appKind: product`
  so consent is skipped, redirect `com.efesto.projects://oauth/callback`,
  scopes incl. `offline_access`), wired into `seedBootstrap` without touching
  the `PLATFORM_APPS` contract or its counts.

## What was built

- `apps/projects-mobile` (`@876/projects-mobile`): expo-router tabs
  (Home/Projects/Issues/Notifications/More), project detail, issue
  list/detail/create/edit, comment thread + create/delete, org switcher,
  sign-in with org picker, SecureStore atomic token blob, proactive refresh,
  org-scoped TanStack Query keys with logout/switch invalidation, focus +
  connectivity managers, secrets-guard test.
- Session-tier groundwork (pre-existing uncommitted work, verified green):
  dual-guard API routes, `@876/projects/session` bearer transport.

## Verification

- mobile: typecheck clean, eslint clean, vitest 10/10, expo-doctor 21/21,
  `expo export --platform android` succeeds (3.6MB bundle).
- enterprise: typecheck clean, route lint clean.
- api: typecheck clean, seeds tests 135/135 (incl. 4 new native-app tests).
- projects-api: full suite re-run (see `/tmp/papi.log` at report time).
- sdk: 327/327 (unchanged, pre-reboot).

## Follow-ups (not done here)

- Run `pnpm --filter @876/api seed` in staging/prod to register the native
  client; set mobile `.env` (`EXPO_PUBLIC_OAUTH_CLIENT_ID=876_projects_mobile`,
  `EXPO_PUBLIC_876_AUTHORIZE_URL=https://enterprise.876.app/api/oauth/native-authorize`).
- Physical Android device validation (dev build, OAuth callback, refresh,
  org-switch isolation) — mandatory before release.
- Real branding assets; EAS profiles/`runtimeVersion` when build adopted.
- Comment edit UI is API-ready (`useUpdateComment`) but has no screen affordance yet.
