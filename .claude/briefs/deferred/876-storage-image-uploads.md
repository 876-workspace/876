# Deferred — Console image uploads powered by 876 Storage

Captured 2026-08-02 from the user, mid-way through the streaming/perf work.
**Not to be started until phases 1–6 of `feature/streaming-perf` have landed.**
This file exists so the requirement is not lost and does not have to sit in
working context.

## What the user asked for

> "I want to be able to add image upload in console specifically to
> organizations and also to users and applications as well … I should be able
> to hover over the image of the application and then it should allow me to
> click and then it comes up with the whole change image thingy … and uses 876
> storage under the hood to store and keep that application image."
>
> "… so that when I go into couriers for example, if the organization is a
> courier, they would see that org logo … when we change the logo of an
> application, right there in the users page in console where it lists the users
> and shows the apps they're signed up on, it will use that app's logo — or an
> initial if not there. So every logo and every application that we use should
> be able to manage or change their image at any time, all powered securely by
> 876 Storage under the hood."

## Requirement, restated

1. **Three upload surfaces in Console**, all the same interaction:
   - App logo — `apps/console/src/app/(app)/apps/[slug]/`
   - Organization logo — `apps/console/src/app/(app)/orgs/[slug]/`
   - User avatar — `apps/console/src/app/(app)/users/[username]/`
2. **Interaction**: hover the existing image → an overlay affordance appears →
   click opens a change-image dialog (pick/drag a file, preview, optionally
   crop, save, and a way to remove the current image).
3. **Storage**: 876 Storage, not a bespoke bucket, not a data URL, not a
   third-party uploader.
4. **Propagation**: the stored image must be the single source for every
   surface that renders that entity's logo/avatar — notably the Apps column of
   the Console users table (`users/_components/columns.tsx`, `AppLogoChip`) and
   the couriers org branding — with a deterministic initial/monogram fallback
   when no image is set. `OrgAvatar` (`packages/ui/src/components/org-avatar.tsx`)
   already implements exactly that fallback and should be the shared renderer.

## Architecture constraints — read `.claude/rules/storage-architecture.md` first

That rule is binding and already answers most of the design. Key points that
apply directly here:

- **Upload routes are server-declared policies.** This work needs named routes
  along the lines of `organization.primaryLogo` (the rule already names this one
  as the in-scope reference), plus `app.logo` and `user.avatar`. The route fixes
  MIME types, max size, owner, `category` and `audience` — the client picks a
  route name and nothing else.
- **Classification for all three**: `category: 'attachment'` (they hang off a
  business record; they must never appear in a browsable Drive listing and must
  not be user-renamable/deletable out from under the entity) and
  `audience: 'public'` (world-readable, stable CDN URL, public bucket). The rule
  calls out an org logo as exactly this pair — re-read the "two axes are
  independent" table before writing code.
- **Reference by opaque `fileId`.** `organizations.logo_file_id` is the
  canonical link; a rendered URL is a cache, never the identity. Same shape for
  the app and user records.
- **Server-generated object keys only.** The client never supplies a key,
  bucket, owner, category, audience, or purpose.
- **R2 has no presigned POST**, so size cannot be capped at the edge. Sign
  `Content-Type`/`Content-Length` into the presigned `PUT`, reject the declared
  size against the route max _before_ signing, and HEAD-verify the object on
  completion — deleting it and marking the file `failed` on mismatch. Never mark
  `ready` on the client's word.
- **SVG is not accepted** until a sanitization step exists (active-content
  format).
- Quota reservation/release protocol applies (`storage_usage`,
  `bytes_reserved`, the exactly-once `reservation_released_at` guard).

Also relevant:

- `.claude/rules/api-access.md` / `sdk-conventions.md` — the browser cannot hold
  the secret key, so the upload-session start and completion go through thin
  Console route handlers (`app/api/...`) that authorize first
  (`requireConsolePermission`) and then call `$876`. No server actions.
- `.claude/rules/app-structure.md` — a shared change-image dialog used by three
  different detail pages is `components/patterns/`, not a route-local
  `_components/`. Promote to `packages/ui` only once a second app needs it.

## Already built — start here, do not rebuild it

**Couriers already implements the whole org-logo upload flow against 876
Storage.** Found 2026-08-03 while working nearby:

- `apps/couriers/src/app/org/[orgSlug]/settings/orgprofile/_components/organization-logo-upload.tsx`
  — the client component: file picker, size/type gate
  (`MAX_LOGO_SIZE_BYTES = 5MB`, `image/png|jpeg|webp` — note SVG correctly
  excluded), a phased progress ring (`starting → uploading → verifying → done`)
  and `OrgAvatar` for the preview/fallback.
- `organization-logo-upload.test.tsx` beside it — existing coverage to mirror.
- `apps/couriers/src/lib/client/upload.ts` — `putDirectToStorage`, the direct-
  to-R2 PUT.
- `apps/couriers/src/types/storage.ts` — `OrganizationLogoFile`,
  `OrganizationLogoUploadSession`.

So the session→PUT→verify contract, the upload route, and the UX vocabulary all
exist. This work is therefore **mostly porting and generalizing**, not greenfield:

1. Confirm which upload routes the Storage service actually declares today
   (`organization.primaryLogo` at minimum) and add `app.logo` / `user.avatar`.
2. Promote the couriers upload component to a shared
   `components/patterns/` (or `packages/ui`) change-image dialog with the hover
   affordance, parameterized by upload route + current image + fallback name.
3. Wire Console's three detail pages to it.

Read the couriers implementation before designing anything new — matching it is
the goal, and any divergence should be deliberate.

## Answered by inspection (2026-08-03) — questions 1 and 2

**Delegation:** this work goes to **`gpt-5.6-sol` at medium reasoning effort**
(user instruction, 2026-08-03), not `gpt-5.6-terra`.

**1. The Storage service exists: `apps/storage-api`.** Upload routes are
declared in `apps/storage-api/domains/uploads/routes.py` as a frozen dataclass
keyed by route name. **Only `organization.primaryLogo` is declared today**, so
`app.logo` and `user.avatar` are genuinely new routes. The shape to copy:

```python
@dataclass(frozen=True)
class UploadRoute:
    key: str
    purpose: str
    owner_type: str
    allowed_content_types: tuple[str, ...]
    max_size_bytes: int
    category: str
    audience: str
    key_template: str

"organization.primaryLogo": UploadRoute(
    key="organization.primaryLogo",
    purpose="organization_logo",
    owner_type="organization",
    allowed_content_types=("image/png", "image/jpeg", "image/webp"),
    max_size_bytes=5 * 1024 * 1024,
    category="attachment",
    audience="public",
    key_template="organizations/{owner_id}/branding/{file_id}/{version_id}",
)
```

Note it already matches the rule: `attachment` + `public`, no SVG, 5 MB cap,
server-side `key_template`. The new routes follow the same pattern with
`owner_type="app"` / `"user"` and their own key templates. There are existing
tests to extend — `tests/test_architecture_invariants.py` asserts on
`UPLOAD_ROUTES["organization.primaryLogo"]`.

**2. Column state differs per entity — one already done, two need migrations:**

| Entity       | Today                                                                                                                                                                   | Needed                                        |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| Organization | **`logo_file_id` already exists** (`apps/api/db/migrate.py` → `ensure_organizations_logo_file_id_column`, revision 2; serialized in `domains/organizations/schemas.py`) | nothing                                       |
| App          | `logo_url` string only (`apps/api/db/models/apps.py`)                                                                                                                   | add `logo_file_id` + migration + serializer   |
| User         | `avatar` string only (`apps/api/db/models/users.py`)                                                                                                                    | add `avatar_file_id` + migration + serializer |

So the org path is the working end-to-end reference across **all three layers**
— storage route, core column, couriers UI — and the app/user paths need the
core-API half built to match. Follow `ensure_organizations_logo_file_id_column`
as the migration precedent.

## Open questions still to settle

3. Cropping — is a client-side crop step wanted, or is a plain
   pick-preview-upload enough for v1? Cropping pulls in a dependency; ask before
   adding one.
4. Removal semantics — does clearing a logo soft-delete the file
   (`.claude/rules/deletions.md`) and null the reference, or only null the
   reference?

## Suggested phase split when this is picked up

1. Storage upload routes for `app.logo` and `user.avatar` (+ whatever is missing
   for org), in the Storage service — server-side policy, quota, verification.
2. Core API: `logo_file_id`/`avatar_file_id` columns, serializers, admin
   endpoints; `@876/admin` methods.
3. Console: shared `ChangeImageDialog` in `components/patterns/`, the hover
   affordance, and the three thin route handlers.
4. Propagation: make every logo/avatar render site go through `OrgAvatar` (or an
   equivalent shared renderer) reading the stored image with initial fallback —
   Console users-table Apps column, app detail, org detail, couriers branding.
