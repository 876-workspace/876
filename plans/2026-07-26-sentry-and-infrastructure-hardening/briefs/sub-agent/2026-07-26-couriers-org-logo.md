# Brief — Couriers organization logo upload (876 Storage Phase 3)

**Tool:** `codex exec`, model `gpt-5.6-sol`, `model_reasoning_effort=high`.
**Branch:** `feat/couriers-org-logo-upload` (already checked out — do **not**
switch branches, do **not** commit, do **not** push. The orchestrator commits.)

## Goal

Make this real, end to end: a Couriers organization owner/admin opens
**org settings → org profile**, drops in a PNG/JPEG/WebP, and the organization's
logo is stored in R2 and rendered everywhere Couriers shows that organization.

Today that UI is a dead placeholder reading _"Logo upload is coming soon."_
Replace it with a working upload. **Upload only — no file browser, no gallery,
no Drive UI.** That is deliberate and out of scope.

## Read first, in this order

1. `.claude/rules/storage-architecture.md` — the `category`/`audience` model and
   the upload flow. The org logo is `category: attachment`, `audience: public`.
2. `.claude/briefs/sub-agent/2026-07-25-storage-api-contract.md` — the Storage
   HTTP contract (already implemented in `apps/storage-api`).
3. `.claude/rules/api-access.md` — **no server actions**; client mutations go
   through a thin pure-transport route handler that authorizes, then calls out.
4. `.claude/rules/sdk-conventions.md`, `.claude/rules/app-layout.md`,
   `.claude/rules/code-style.md`, `.claude/rules/feature-flags.md`.

## Architecture you must follow (already decided — do not redesign)

```
browser → Couriers route handler → @876/storage → storage-api → signed R2 URL
             ↑ authorizes the actor      ↑ validates route policy
               against THIS org            owns key/category/audience
```

The **browser never calls storage-api**. Its only direct contact with R2 is the
signed `PUT`. Couriers decides "may this user edit this org's branding";
Storage decides "is this a legal upload for this route". Both are required.

`packages/storage` is the client (`$storage.uploads.create`,
`$storage.uploads.complete`, `$storage.files.*`). It is **server-only** — never
import it into a client component.

## What to build

### 1. Core API — `logo_file_id` on organizations

`apps/api` owns the organization record. Add `logo_file_id` as the canonical
reference to the uploaded file:

- Column on the `Organization` model (`apps/api/db/models/orgs.py`), nullable
  `String`, **no foreign key** — Storage is a separate bounded context.
- Field on `OrgProfileUpdate` (`apps/api/domains/organizations/schemas.py`) and
  on the organization response schema.
- One entry in `_apply_org_profile_fields`
  (`apps/api/domains/organizations/router.py`) so it is writable.
- A schema migration. **`apps/api` has no Alembic** — it evolves via
  `create_all(checkfirst=True)` plus idempotent hand-written DDL in
  `apps/api/db/migrate.py`. Add a guarded `ensure_organizations_logo_file_id_column`
  following the existing `ensure_*_column` pattern there, and wire it into the
  startup bootstrap in `main.py` exactly like its neighbours.
- Expose it through the platform client used by Couriers
  (`packages/core/src/platform/`) so `orgs.retrieveProfile`/`updateProfile`
  carry it.

**`logo_url` stays** and remains the rendered URL — it is a denormalized cache
written when an upload verifies. `logo_file_id` is the source of truth. Do not
delete `logo_url` or its existing wiring; it is already fully writable.

### 2. Couriers route handlers

Under `apps/couriers/src/app/api/manage/settings/orglogo/`, two thin handlers.
Follow the existing sibling `orgprofile/route.ts` exactly for shape, Zod
validation, `getManageContext`, and error responses.

- `POST` (start): validate body (`file_name`, `content_type`, `size_bytes`),
  resolve `getManageContext(orgSlug)`, **401** if null, **403** unless
  `ctx.role` is `owner` or `admin`, then call
  `$storage.uploads.create({ route_key: 'organization.primaryLogo', owner_type:
'organization', owner_id: ctx.orgId, actor_user_id: ctx.userId,
source_app_id: '876-couriers', ... })` and return the signed instructions.
- `POST .../complete`: same authorization, then `$storage.uploads.complete(id)`,
  then persist to core via `platform.orgs.updateProfile(ctx.orgId, {
logo_file_id: file.id, logo_url: file.url })`, and return the file.

**The org id must come from `ctx`, never from the request body.** A client that
supplies an `organizationId` must not be able to influence which org is written.
This is the single most important line in this brief.

Do **not** trust any client-supplied `category`, `audience`, `purpose`, bucket,
or object key — the route key is the only thing the client names.

### 3. Couriers UI — a dropzone, not a browser

Replace the placeholder in
`apps/couriers/src/app/org/[orgSlug]/settings/orgprofile/profile-form.tsx`
(the `FieldRow label="Organization logo"` block, currently a dashed box with
"Logo upload is coming soon").

Build a small client component that:

- accepts PNG/JPEG/WebP up to 5 MiB, validating **client-side for UX** while
  understanding the server is the real gate;
- calls start → `PUT`s the bytes straight to R2 with **exactly** the returned
  `headers` (both `Content-Type` and `Content-Length` are signed; any deviation
  yields `SignatureDoesNotMatch`) → calls complete;
- shows progress, and a clear error message on failure;
- renders the current logo with a Replace affordance, and falls back to the
  existing initials/placeholder when there is none;
- is disabled entirely when `canEdit` is false (the page already computes it).

**Replacement must never remove the current logo until the new one is `ready`.**
If the upload fails at any step the existing logo must still render.

Respect `.claude/rules/app-layout.md` (bare verb button labels) and the **no
green buttons** rule. Do not add a wordy description paragraph under the field.

### 4. Render the logo

Codex discovery found the slot already exists: `packages/ui/src/components/org-avatar.tsx`
takes a `src` and renders a raw `<img>` (so **no `next/image` `remotePatterns`
config is needed**). Thread the logo URL through:

- `packages/ui/src/components/org-switcher.tsx` — add a logo field to
  `OrgSwitcherOrg` and pass `src` at all three `OrgAvatar` call sites;
- `apps/couriers/src/lib/auth/manage-context.ts` + `apps/couriers/src/types/auth.ts`
  — carry the logo on `OrgSummary` / `ManageContext`;
- `apps/couriers/src/app/org/[orgSlug]/layout.tsx` — pass it into the shell;
- `apps/couriers/src/components/couriers-sidebar.tsx` — replace the hard-coded
  `C` tile with logo-aware rendering, keeping a fallback.

Keep the portal surfaces out of scope for this pass.

### 5. Feature flag + errors

- Seed `couriers_storage_org_logo_upload` in `apps/api/services/feature_seeds.py`
  under the Couriers app, per `.claude/rules/feature-flags.md`. Evaluate it via
  the existing `getFeatures()` helper in `apps/couriers/src/lib/features.ts`.
  When it is off, **new uploads are disabled but an existing logo still renders.**
- Add `storage/*` error codes to Couriers' registry
  (`apps/couriers/src/lib/errors/`), matching the existing entry shape.

## Verification (must pass, and report real output)

```bash
pnpm --filter @876/api test        # or: cd apps/api && python -m pytest
cd apps/api && python -m mypy . tests && python -m ruff check .
pnpm --filter @876/couriers typecheck
pnpm --filter @876/couriers test
pnpm --filter @876/ui typecheck
```

Add tests for: unauthorized member refused, org id taken from context and not
the body, bad MIME rejected, oversize rejected, failed upload leaving the
existing logo intact, and successful replacement updating the org.

## Constraints

- Do not modify `apps/storage-api/` or `packages/storage/` — they are done and
  under review in another PR.
- No server actions. No raw `fetch` from Couriers to FastAPI.
- Do not import `@876/storage` into any client component.
- Do not build a file browser, gallery, folder tree, or any Drive UI.
- Do not commit, push, or switch branches.

## Report back

Files changed; the exact authorization checks in each handler; commands run with
their real output; anything you interpreted; anything unfinished. Report failures
honestly — a green report on red code is worse than useless.
