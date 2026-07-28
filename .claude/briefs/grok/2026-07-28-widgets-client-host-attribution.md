# Brief — Wire the widget host into every app's Widgets client

**Tool:** `grok` (`grok-4.5`), headless
**Repo:** `/workspaces/876` — work on the current branch
**Do not commit. Do not push. Do not open a PR.** The orchestrator stages and
commits. Do not run `git commit` for any reason.

---

## 1. Background — what just changed and why this task exists

The Widgets service (`apps/widgets-api`) stores Notepad notes. Notepad is a
**shared** widget: the same note-taking widget runs inside 876 Console, 876
Billing and 876 Couriers, and every note is owned by an 876 account rather than
by any one app.

Until now a stored note recorded **who** owned it but not **where it was
written**. An admin looking at a note in Console had no way to tell whether the
user wrote it in Couriers or in Billing. We just added that attribution:

- `notepad_notes` gained a nullable `source_host` column.
- `apps/widgets-api/src/lib/auth/service-key.ts` now reads an
  `x-876-widget-host` request header, validates it against the known host list,
  and returns it as `auth.sourceHost` (invalid or missing ⇒ `null`).
- `apps/widgets-api/src/app/api/v1/notes/route.ts` `POST` passes
  `auth.sourceHost` into `createNote`, which persists it.
- `packages/widgets/src/server/request.ts` gained an optional `host` option on
  `CreateWidgetsClientOptions`; when set, `requestJson` sends it as the
  `x-876-widget-host` header.

**The plumbing is done end to end except for one step: no app actually sets
`host` yet.** So every note created today still stores `source_host = null`.
Your job is that final step, and nothing else.

## 2. Exactly what to change — three files, one line each

Add `host: '<the app's host key>'` to each `createWidgetsClient(...)` /
`createWidgetsAdminClient(...)` call.

The host key comes from the `WidgetHost` union in
`packages/widgets/src/catalog.ts`:

```ts
export type WidgetHost =
  | 'console'
  | 'billing'
  | 'couriers'
  | 'enterprise'
  | '876'
```

### File 1 — `apps/console/src/lib/widgets.ts`

Current content:

```ts
import 'server-only'

import { createWidgetsClient } from '@876/widgets/server'
import { createWidgetsAdminClient } from '@876/widgets/server/admin'

/** Server-only client for the Widgets API (no DB credentials in Console). */
export const $widgets = createWidgetsClient({
  baseUrl: process.env.WIDGETS_API_URL,
  serviceKey: process.env.WIDGETS_SERVICE_KEY,
})

export const $widgetsAdmin = createWidgetsAdminClient({
  baseUrl: process.env.WIDGETS_API_URL,
  serviceKey: process.env.WIDGETS_SERVICE_KEY,
})
```

Add `host: 'console'` to **both** calls.

### File 2 — `apps/billing/src/lib/widgets.ts`

Add `host: 'billing'` to the single `createWidgetsClient(...)` call.

### File 3 — `apps/couriers/src/lib/widgets.ts`

Add `host: 'couriers'` to the single `createWidgetsClient(...)` call.

That is the entire change. Three files. No other file in the repository should
appear in `git status` when you are done.

## 3. Why a literal and not an environment variable

`resolveConfig` already falls back to `process.env.WIDGETS_HOST`. **Do not use
that fallback here, and do not add `WIDGETS_HOST` to any `.env`, `.env.example`
or `wrangler.jsonc`.**

The host is a fixed property of the source code — the file
`apps/couriers/src/lib/widgets.ts` is, by definition, the Couriers client and
can never be anything else. Putting it in the environment would let a
misconfigured deploy silently mis-attribute every note it writes, and would add
a required variable to three deployment targets for a value that is already
known at author time. The literal is both safer and simpler.

## 4. Hard constraints — read carefully

- **Touch only those three files.** Do not edit `packages/widgets/`,
  `apps/widgets-api/`, `apps/api/`, or anything under
  `apps/console/src/components/` or `apps/console/src/app/`. Other agents are
  actively editing several of those paths right now and your edits would
  collide.
- **Do not** add tests for this. A one-line literal in a module-level config
  object has nothing meaningfully testable; a test asserting the literal equals
  itself is noise. If you believe otherwise, say so in your report instead of
  writing it.
- **Do not** reformat, reorder imports, or "tidy" the files. The diff should be
  exactly the added lines.
- **Do not** run `git commit`, `git add`, `git push`, or `git checkout`.
- Follow `.grok/rules/code-style.md` for formatting conventions. Do **not**
  open `.grok/rules/advisor.md` — irrelevant here.

## 5. Verify — run all three, report the real output

```
pnpm --filter @876/console typecheck
pnpm --filter @876/billing typecheck
pnpm --filter @876/couriers typecheck
```

Notes on interpreting failures:

- If a typecheck fails with an error in a file you did **not** edit, that is a
  pre-existing or concurrent failure from another agent's in-flight work. Say
  so explicitly, name the file and error, and do **not** try to fix it.
- The only failure you own is one pointing at one of your three files — most
  likely `host` not existing on the options type, which would mean
  `packages/widgets/src/server/request.ts` does not have the change described
  in §1. If that happens, stop and report it rather than editing that file.

## 6. Report back

State plainly:

1. The exact diff you produced (all three files).
2. The verbatim result of each of the three typecheck commands.
3. Confirmation that `git status --short` shows only those three files as
   modified (list anything else you see, but do not act on it — an untracked
   `apps/billing/core` file is known and must be ignored).

## 7. Honesty requirement

Do not report a command as passing unless you ran it and saw it pass. If you
cannot complete the task within the constraints above, say exactly what blocked
you. A truthful partial result is more useful than a confident wrong one.
