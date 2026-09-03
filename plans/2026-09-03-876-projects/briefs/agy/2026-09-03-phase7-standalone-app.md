# Brief — Phase 7: `apps/projects`, the standalone 876 Projects app

You are implementing **Phase 7** of 876 Projects: the org-workspace Next.js app
on port **3008**. Read `plans/2026-09-03-876-projects/plan.md` first.

**Repository root:** `/root/projects/876`
**Branch:** `feat/876-projects` (already checked out — do NOT create, switch, or
merge any branch, and do NOT commit. The orchestrator commits.)

**Depends on Phases 3 and 6.** `packages/projects` must export its `session`
entrypoint, and `packages/projects-ui` must exist. If either is missing, stop
and report it rather than inventing one.

---

## 0. The single most important instruction

**Copy `apps/crm`.** It is the closest existing org-workspace app and the
reference for every convention here. Read, before writing anything:

| Read this | To learn |
| --- | --- |
| `apps/crm/package.json`, `next.config.ts`, `tsconfig.json` | scripts, port, `transpilePackages`, `reactCompiler` |
| `apps/crm/src/app/api/auth/[...path]/route.ts` | the auth bridge |
| `apps/crm/src/app/callback/route.ts` | the social callback |
| `apps/crm/src/lib/auth/session-cookie.ts` | the session-cookie re-export |
| `apps/crm/src/lib/auth/` (guards, context, app-access) | route guards |
| `apps/crm/src/lib/services/` | bounded client composition |
| `apps/crm/src/app/(app)/layout.tsx` | the shell and its guard |

Also read `.claude/rules/new-app-guide.md` end to end and
`.claude/rules/product-org-signup.md` in full. Where this brief and `apps/crm`
disagree, this brief wins; where this brief is silent, do what `apps/crm` does.

---

## 1. Fixed facts

| Thing | Value |
| --- | --- |
| Package name | `@876/projects-app` |
| Path | `apps/projects` |
| Port | **3008** |
| Platform app slug | `876-projects` |
| Realm | `enterprise` |
| API key env | `PROJECTS_API_876_KEY` |

---

## 2. Auth — the part that is expensive to get wrong

1. **The bridge** at `src/app/api/auth/[...path]/route.ts` is pure transport: it
   attaches this app's API key, its realm, and the request origin, forwards to
   the core API, and relays `Set-Cookie` verbatim. Change exactly two things
   from the copied file — the **API key env name** (`PROJECTS_API_876_KEY`) and
   the realm.
2. **`X-876-Realm: enterprise`**, and the **callback must send the same realm as
   the bridge.** When they disagree, password sign-in works and social sign-in
   silently completes in the wrong realm and bounces to `/login`. That was a
   real Invoice bug.
3. **`src/lib/auth/session-cookie.ts` re-exports `@876/core/auth/session-cookie`.**
   Never implement HMAC verification per app. The presence of this file is how
   `pnpm check:session-secret` discovers the app.
4. Prefer Couriers' `requireValidSession` shape: a sealed cookie keeps proving
   "someone signed in" long after that account was deleted or disabled.
5. **No `proxy.ts`, no `middleware.ts`.** Guards live in RSC layouts via
   `src/lib/auth/guards.ts`.

---

## 3. Org sign-up — ships with the app or the app does not ship

`.claude/rules/product-org-signup.md` is binding. A signed-in Enterprise account
with **no organization** must reach onboarding, never `/no-access`:

```
active membership              → workspace home
no membership                  → organization creation
entitlement missing, owner/admin → the app's get-started route (they can activate it)
entitlement missing, staff       → /no-access
entitlement blocked, everyone    → /no-access
```

- Keep the role/entitlement decision in **one** place — the get-started route
  decides, the layout redirects there unconditionally.
- Resolve memberships **live** from the platform API, not from the sealed
  session cookie, so a freshly created org is visible on the next request.
- A consumer-realm session gets an in-app wrong-account page with an action that
  clears the session and returns to `/login` — never an automatic redirect into
  the consumer app.
- If the app has a root dynamic org route, reserve every static root segment and
  reject any slug containing `.` with `notFound()`, or `/favicon.ico` becomes an
  organization and loops through `/login`.

---

## 4. Configuration

- `.env.example` declares every variable the app reads. Mark optional ones
  `# optional — <why>`; anything without an in-code default is required.
- `NEXT_PUBLIC_APP_URL` **must** be set — its unset fallback ships `localhost`
  to production, where the "go to my 876 account" escape link sends real users
  to their own machine.
- `next.config.ts` uses `sharedTranspilePackages([...])` from
  `scripts/shared-ui-packages.mjs`. Do not hand-copy the shared list.
- `reactCompiler: true`. Do **not** enable `cacheComponents` or
  `partialPrefetching`.
- Add a `dev:projects` script to the root `package.json` that includes
  `pnpm check:session-secret`, exactly as every other `dev:*` script does.

---

## 5. Data access

- Server components call the app's own bounded modules under
  `src/lib/services/`, at the **session** entrypoint — a signed-in human is the
  principal. Do not pass an internal key from a page.
- **No server actions.** Client mutations go through a thin route handler under
  `src/app/api/<resource>/` that authorizes, then calls the owning client, and
  contains no business logic.
- Browser URLs use the product's own resource vocabulary (`/api/issues`), never
  a service namespace or a backend version.
- Render shared screens from `@876/projects-ui`; the app supplies data, hrefs,
  and callbacks.

---

## 6. Layout and loading

Follow `.claude/rules/app-layout.md` and the loading rules: chrome renders
immediately, only data shimmers, table fallbacks carry the real column set, page
titles use `876-page-title`, the Add button is `primaryVariant="info"`, and there
are no green buttons and no explanatory paragraph under a heading.

---

## 7. Do NOT

- Do NOT create, switch, rebase, merge, or delete any git branch.
- Do NOT run `git commit`, `git add`, or `git push`.
- Do NOT run `pnpm install` or edit `pnpm-lock.yaml` — report needed
  dependencies; the orchestrator owns the lockfile.
- Do NOT modify `apps/projects-api/`, `apps/console/`, or `packages/projects/`.
- Do NOT add `proxy.ts` or `middleware.ts`.
- Do NOT add a server action.
- Do NOT implement session verification yourself.
- Do NOT write `eslint-disable`, `as any`, `@ts-ignore`, or `@ts-expect-error`.
- Do NOT commit a real secret to `.env.example`.
- Do NOT write a `README.md`.

---

## 8. Tests

Minimum **18** `it()` cases. Required:

- the bridge sends `X-876-Realm: enterprise` and this app's API key;
- the callback sends the **same** realm as the bridge;
- the bridge relays `Set-Cookie` verbatim;
- a missing API key is reported rather than silently forwarded;
- a signed-in account with no membership is routed to onboarding, **not**
  `/no-access`;
- an owner whose org lacks the entitlement reaches get-started;
- a `staff` member whose org lacks the entitlement gets `/no-access`;
- a `blocked` entitlement gets `/no-access` for every role, owners included;
- a consumer-realm session gets the wrong-account page and is not redirected
  into the consumer app;
- a deleted/disabled account still gets the login form rather than a redirect
  loop;
- the app contains no `proxy.ts` or `middleware.ts` (assert it from the tree);
- `next.config.ts` uses the shared transpile list.

Assert complete shapes and exact call arguments.

---

## 9. Verify before you report

```bash
cd /root/projects/876
pnpm --filter @876/projects-app typecheck
pnpm --filter @876/projects-app lint
pnpm --filter @876/projects-app test
node scripts/check-app-structure.mjs
pnpm check:transpile
pnpm check:env
```

Report the real output, or say plainly that you could not run a command.

---

## 10. Report

Write to
`plans/2026-09-03-876-projects/reports/agy/2026-09-03-phase7-standalone-app.md`
with: every file created, the **counted** `it()` cases per file, the exact
output of §9, decisions this brief did not settle, and anything you could not
do. A truthful "not done" is worth far more than a confident claim that turns
out to be false.
