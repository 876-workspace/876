# Brief — Phase 7c: hover-to-change image upload in Console

**Model: `gpt-5.6-sol`, medium reasoning effort** (user instruction 2026-08-03,
"use sol for the image stuff", "5.6 sol on medium").

## Why — this is the phase the user actually asked for

The user's request, verbatim:

> "I want to be able to add image upload in console specifically to
> organizations and also to users and applications as well … I should be able to
> hover over the image of the application and then it should allow me to click
> and then it comes up with the whole change image thingy … and uses 876 storage
> under the hood."

Phases 1 and 2 built the backend halves and are **merged to `main`**:

- **Phase 1 (#165)** — `app.logo` and `user.avatar` upload routes in
  `apps/storage-api/domains/uploads/routes.py`, alongside the existing
  `organization.primaryLogo`.
- **Phase 2 (#167)** — `apps.logo_file_id` and `users.avatar_file_id` columns,
  migrations, serializers, and the fields on the `@876/admin` app/user resource
  and update-param types. `organizations.logo_file_id` already existed.

**Nothing is visible in Console yet.** That is this phase. When you are done, an
admin must be able to hover the image on an app, org, or user detail page, click
it, pick a file, and see the new image — with a way to remove it.

Full feature spec: `.claude/briefs/deferred/876-storage-image-uploads.md`.
**Read these rules before writing code**: `.claude/rules/storage-architecture.md`
(binding — the two-axes table and the upload flow), `.claude/rules/api-access.md`
(no server actions; thin route handlers that authorize first),
`.claude/rules/app-structure.md` (where a component lives),
`.claude/rules/app-layout.md` (Console page/dialog conventions),
`.claude/rules/deletions.md` (removal).

## Scope — files you may touch

- `apps/console/src/components/patterns/**` — the new shared dialog + affordance
- `apps/console/src/app/api/storage/**` — the new route handlers
- `apps/console/src/lib/client/**` — the typed browser client additions
- `apps/console/src/types/**` — request/response contracts and Zod schemas
- `apps/console/src/app/(app)/apps/[slug]/layout.tsx`
- `apps/console/src/app/(app)/orgs/[slug]/layout.tsx`
- `apps/console/src/app/(app)/users/[username]/layout.tsx`
- Tests beside each of the above

Nothing else. **Not** `apps/api`, **not** `apps/storage-api`, **not**
`apps/couriers`, **not** `packages/**`. If you believe a change is needed in
`packages/ui` or the API, **stop and report it** rather than making it — that is
a phase-4 concern.

> **Prerequisites already landed — do not re-report them.** A first run of this
> brief stopped on two genuine blockers, both now fixed in #169 (merged):
> `AdminOrganization` and `AdminOrganizationUpdateParams` in
> `packages/admin/src/types.ts` now carry `logo_file_id`, so the organization
> handlers can read and write it exactly like the app and user ones; and the
> `console:orgs` permission typo is corrected. Stopping was the right call — this
> note exists so the second run proceeds.

Do not run any `git` command (no commit, branch, stash, checkout, restore,
clean). Do not "fix" unrelated things you notice.

## The reference implementation — port it, do not reinvent

**Couriers already does this whole flow for org logos.** Read all of it first;
matching it is the goal and any divergence must be deliberate:

| File                                                                                               | What it gives you                                                                                                                    |
| -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `apps/couriers/src/app/org/[orgSlug]/settings/orgprofile/_components/organization-logo-upload.tsx` | 397 lines: file picker, client-side size/type gate, phased progress (`starting → uploading → verifying → done`), `OrgAvatar` preview |
| `…/organization-logo-upload.test.tsx`                                                              | the coverage shape to mirror                                                                                                         |
| `apps/couriers/src/lib/client/upload.ts`                                                           | `putDirectToStorage` — the direct-to-R2 `PUT`                                                                                        |
| `apps/couriers/src/types/storage.ts`                                                               | the start/complete Zod schemas and session/file types                                                                                |
| `apps/couriers/src/app/api/manage/settings/orglogo/route.ts`                                       | the **start** handler                                                                                                                |
| `apps/couriers/src/app/api/manage/settings/orglogo/complete/route.ts`                              | the **complete** handler — verify, check owner, then update the profile                                                              |

## The three surfaces

Each detail page already renders the image; you are adding the affordance around
the existing renderer, not replacing it.

| Entity | Layout file                                    | Renders today                                    | Upload route key           | Reference fields            |
| ------ | ---------------------------------------------- | ------------------------------------------------ | -------------------------- | --------------------------- |
| App    | `app/(app)/apps/[slug]/layout.tsx:45`          | `<AppLogo name={app.name} src={app.logo_url} …>` | `app.logo`                 | `logo_file_id` + `logo_url` |
| Org    | `app/(app)/orgs/[slug]/layout.tsx:70,84`       | `OrgLogo … src={org.logo_url}` (two breakpoints) | `organization.primaryLogo` | `logo_file_id` + `logo_url` |
| User   | `app/(app)/users/[username]/layout.tsx:88,111` | `<AvatarImage src={user.avatar} …>` (two)        | `user.avatar`              | `avatar_file_id` + `avatar` |

Note the org and user layouts render the image **twice** (desktop and mobile
breakpoints). Both must get the affordance, or it works on one viewport only.

`owner_type` per route is fixed by the Storage route declaration, not by you:
`app.logo` → `platform` (owner_id is the app ID), `organization.primaryLogo` →
`organization`, `user.avatar` → `user`.

## What to build

### 1. `ChangeImageDialog` — shared, in `components/patterns/`

Per `app-structure.md`, a component used by three unrelated routes in one app is
`components/patterns/`, **not** a route-local `_components/` and **not**
`features/`. Do not promote it to `packages/ui` in this phase — that happens only
when a second app needs it.

It is a client component, parameterized so all three surfaces use one instance:

- the upload route key and owner ID
- the current image URL and the fallback name (for the monogram)
- callbacks/endpoints for start, complete and remove

Behavior: pick or drag a file → client-side gate on type and size → preview →
save → phased progress → done. Plus a **Remove** action when an image is set.

**No cropping** (user decision, 2026-08-03). Do not add a crop step and do not
add an image-processing dependency. The image is rendered inside `OrgAvatar`'s
square container, which already centres and cover-fits it.

Client-side gate must match the server route policy exactly:
`image/png`, `image/jpeg`, `image/webp`; max `5 * 1024 * 1024`. **No SVG** — it is
an active-content format and the rule forbids it until sanitization exists. The
client gate is UX only; the server is the real enforcement. Do not weaken either.

### 2. The hover affordance

Hovering the image reveals a click affordance (overlay + icon/label); clicking
opens the dialog. It must also be **keyboard reachable and screen-reader
labelled** — a hover-only control is unusable by keyboard, and this is an admin
console. Use a real `<button>` wrapping/overlaying the image with an accessible
name like "Change logo" / "Change avatar", visible on `:hover` **and**
`:focus-visible`.

### 3. Route handlers — `app/api/storage/…`

Per `api-access.md`: **no server actions.** Thin, pure-transport handlers that
authorize first and contain no business logic. Three entities × three operations:

- **start** — `requireConsolePermission(…)`, then
  `$876.storage.uploads.create({ route_key, owner_type, owner_id, actor_user_id, source_app_id: '876-console', file_name, content_type, size_bytes })`
- **complete** — `requireConsolePermission(…)`, then
  `$876.storage.uploads.complete(sessionId)`; **verify `file.owner_type` and
  `file.owner_id` match the target entity**, and that `file.status === 'ready'`
  and `file.url` is set; then write **both** the file ID and the URL onto the
  entity via `$876.<resource>.update()`.
- **remove** — see below.

Copy the couriers ownership check verbatim in spirit — it is what stops a caller
completing someone else's upload session against their own entity.

Permissions — use exactly these keys:
`console:apps`, **`console:organizations`**, `console:users`.

> A first run of this brief correctly stopped here. An earlier draft said
> `console:orgs`, which **no role grants** — `hasPermission` is an exact
> `Array.includes` with no wildcard, so that key 403s every user. The catalog is
> `apps/console/src/lib/db/permissions.ts:69,87,112`. The one existing call site
> using `console:orgs` was a live bug and is fixed in #169. Do not reintroduce it.

`$876` in Console already has Storage wired (`apps/console/src/lib/876.ts`
passes `storage: { internalKey: process.env.STORAGE_INTERNAL_KEY }`), so no
client setup is needed. The storage verbs available are
`$876.storage.uploads.create`, `$876.storage.uploads.complete`,
`$876.storage.files.retrieve`, `$876.storage.files.delete`.

### 4. Removal — decided, do not revisit

**User decision, 2026-08-03: removing an image soft-deletes the Storage file AND
nulls the reference.**

Order matters, and it is: **null the entity reference first, then delete the
file.** If the delete fails after the reference is cleared, the result is an
orphaned file the cleanup sweep reaps — recoverable. The reverse order leaves the
entity pointing at a deleted file, which renders a broken image to every viewer.
Clear both the `*_file_id` and the URL field in the same update.

Phase 2 deliberately kept `apps/api` from ever calling the Storage service, so
this two-step orchestration belongs **here, in the Console route handler**, and
nowhere else. Do not add a cascade in the API.

### 5. Typed browser client

Add the mutation methods to `apps/console/src/lib/client/` following the existing
files there (e.g. `orgs.ts`: thin functions over `request`), and export them from
`index.ts` the way the others are. Components call `client.<resource>.<verb>()`
— never `fetch` directly.

Contracts and Zod schemas go in `apps/console/src/types/` per
`.claude/rules/types.md`, mirroring `apps/couriers/src/types/storage.ts`. Do not
define exported request/response types inside route handlers.

## Security — do not undo any of this

- The client picks a **route key**, never a key, bucket, owner type, category,
  audience or purpose. Those come from the server-declared route.
- The internal Storage key stays server-side. It is why these route handlers
  exist at all.
- Always verify session **and** permission before touching Storage.
- Always verify the completed file's owner matches the entity being updated.
- Never mark anything ready on the client's word — `uploads.complete` is what
  HEAD-verifies the object server-side.

## Tests

- `ChangeImageDialog`: rejects a too-large file and a disallowed type without
  calling the client; happy path calls start → PUT → complete in order with the
  expected arguments; error from each stage surfaces to the user and leaves the
  dialog usable; remove calls the remove endpoint.
- The affordance: reachable by keyboard, has an accessible name, opens the
  dialog on click.
- Each route handler: unauthorized (no session) → 401; authorized but lacking the
  permission → 403; owner mismatch on complete → error and **no** entity update;
  unverified/not-ready file → error and no entity update; happy path updates both
  fields; remove nulls the reference **before** deleting the file.
- Mirror `organization-logo-upload.test.tsx` for the component shape.

## Verification — run each in the FOREGROUND and quote the real output

```bash
pnpm --filter @876/console typecheck
pnpm --filter @876/console test
pnpm --filter @876/console lint
```

Do not summarize as "verification passed" — paste the tail of each. Earlier runs
on this repo claimed success while typecheck was broken and 18 tests were
failing. Note `pnpm --filter @876/console test` is slow; pass a generous timeout
rather than backgrounding it.

## Do not

- Do not commit, branch, stash, or run any `git` write command.
- Do not touch `apps/api`, `apps/storage-api`, `apps/couriers`, or `packages/**`.
- Do not add a crop step or any image-processing dependency.
- Do not accept SVG, or raise the size cap.
- Do not use a server action.
- Do not put business logic in a route handler.
- Do not delete the Storage file before the entity reference is cleared.
- Do not make the affordance hover-only — it must be keyboard reachable.
- Do not add a wordy description paragraph under a heading (root `CLAUDE.md` → UI
  Copy), and do not use a green button (`CLAUDE.md` → UI Design).
- Do not do phase 4 (making every render site read the stored image with a
  monogram fallback — users-table Apps column, couriers branding). Report
  anything you notice, but leave it.

## Report back

1. The `ChangeImageDialog` API (its props) and why it is parameterized that way.
2. The route handler paths and the permission each enforces.
3. The exact removal order you implemented, with the `file:line` proving the
   entity is updated before the file is deleted.
4. How the affordance is reachable without a mouse.
5. The real tail of all three verification commands.
