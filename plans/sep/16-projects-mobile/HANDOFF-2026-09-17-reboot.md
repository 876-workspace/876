!# Handoff — reboot to attach Hetzner volume (2026-09-17)

## Machine state at handoff
- Host: Hetzner, `/` has 34G free of 75G. `/tmp` (tmpfs 3.8G) is 100% full
  (stale `claude-0`, compile caches, pytest leftovers) — unrelated to repo work.
- A new Hetzner volume was added but the machine was never powered off,
  so the volume is not attached yet. Reboot is required.

## Branch state (all on disk, survives reboot)
- Branch: `feature/projects-mobile` @ `9ec68d308` (matches `origin/feature/projects-mobile`).
- Stray `-unused` / `-oh-no` mobile branches: already gone, nothing to delete.
  Other similarly-named branches (`feat/projects-ios-mobile`, etc.) are old
  **web responsive** work, not Expo — no code to consolidate.
- Uncommitted work (DO NOT LOSE — not committed per repo git rules):
  - Modified: `apps/projects-api/package.json`, `src/http/errors.ts`,
    `modules/{automation,calendar,comments,issues,projects}/*controller|routes`,
    `packages/projects/{package.json,src/request.ts,src/runtime.ts,src/types.ts}`,
    `pnpm-lock.yaml` (adds `jose@6.2.9`).
  - New: `apps/projects-api/src/http/session-auth.ts` (+ `__tests__/session-auth.test.ts`),
    `src/platform/session-verifier.ts`, `src/platform/session-access.ts`
    (+ `__tests__/session-access.test.ts`),
    `packages/projects/src/session.ts` (+ `session.test.ts`).
- `apps/projects-mobile` does NOT exist yet — scaffold was starting when `/tmp`
  filled up; decision made to scaffold directly in-repo instead.

## Verified green before reboot
- `pnpm --filter @876/projects test` → 327/327 pass.
- `pnpm --filter @876/projects-api test` → 1863/1863 pass (incl. 22 new session tests).
- `pnpm --filter @876/projects-api typecheck` → clean.
- Expo SDK line confirmed from registry: `expo ~57.0.23`, `expo-router ~57.0.21`,
  `react 19.2.3`, `react-native 0.86.3`, `expo-auth-session 57.0.12`,
  `expo-secure-store 57.0.4`, `expo-dev-client 57.0.19`. Docs: docs.expo.dev
  SDK 57 / RN 0.86 / React 19.2.3 (repo root pins React 19.2.8 — resolve per-app).
- Prod Projects API pinned: `https://876-projects-api.vercel.app`.
- Core OAuth native-callback support already merged on this branch
  (`oauth-redirect-uri.ts`, reverse-domain scheme required for public clients).

## After reboot — resume steps
1. `cd /root/projects/876 && git checkout feature/projects-mobile && git status --short`
   (uncommitted work above must still be there).
2. Optional: mount the new volume, and consider moving pnpm store or `/tmp`
   overflow onto it; clear stale `/tmp` dirs if `/tmp` is still full.
3. Restart dev servers as needed (`pnpm dev:projects:api`, projects-mcp, etc.).
4. Continue: scaffold `apps/projects-mobile` per `plan.md` §6 AD-1..AD-13
   (expo-router tabs, AuthSession PKCE `com.876.projects://oauth/callback`,
   SecureStore tokens, TanStack Query, `@876/projects/session` client).
5. Native OAuth client still needs registering in Core with the exact redirect URI.
6. Then: `expo-doctor`, typecheck/lint/test, device build (EAS) as documented follow-up.
