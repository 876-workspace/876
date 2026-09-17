# 876 Projects Mobile

Android-first Expo client for 876 Projects. Production data only, session
authority only — the app holds no server credential.

## Auth

Public OAuth client (Authorization Code + S256 PKCE, no client secret):

1. The app opens the system browser at the first-party authorize proxy
   (`EXPO_PUBLIC_876_AUTHORIZE_URL`), which signs the user in and drives Core
   `/oauth/authorize` server-side with the internal key.
2. Core redirects the code to `com.efesto.projects://oauth/callback`.
3. The app exchanges the code at Core `/oauth/token` with its PKCE verifier,
   then refreshes with the rotating refresh token (`offline_access` scope).
4. Tokens live only in `expo-secure-store` as one atomic blob; sign-out
   revokes the refresh token and clears the store plus org-scoped queries.

Switching organizations re-runs the browser step with that org's context,
so every Projects call carries an org-bound bearer the API verifies.

## Data

All Projects reads/writes go through `@876/projects/session` against
`https://876-projects-api.vercel.app` (pinned — no environment switch).
Server state lives in TanStack Query with organization-scoped keys;
switching orgs cannot display prior-org rows.

## Develop

```bash
pnpm --filter @876/projects-mobile exec expo start --tunnel
pnpm --filter @876/projects-mobile exec expo-doctor
pnpm --filter @876/projects-mobile typecheck
pnpm --filter @876/projects-mobile lint
pnpm --filter @876/projects-mobile test
```

Ships as a development build (`expo-dev-client`), not Expo Go.
