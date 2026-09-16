# Brief — Phase 7a: `app.logo` and `user.avatar` upload routes in storage-api

**Model: `gpt-5.6-sol`, medium reasoning effort** (user instruction 2026-08-03,
"use sol for the image stuff", "5.6 sol on medium").

## Why

Console needs hover-to-change image upload for **apps**, **organizations** and
**users**, backed by 876 Storage. The org path already works end to end. The app
and user paths do not exist yet, and the first missing piece is the **upload
route declaration** in the Storage service.

This sub-phase is deliberately narrow: **only `apps/storage-api`**. No core-API
columns, no Console UI, no `@876/admin` methods — those are later sub-phases.
Keeping it small means it can be reviewed and landed on its own.

Full feature spec: `.claude/briefs/deferred/876-storage-image-uploads.md`.
Binding architecture rule: `.claude/rules/storage-architecture.md` — **read it
before writing code**, especially the "two axes are independent" table.

## Scope — files you may touch

- `apps/storage-api/domains/uploads/routes.py`
- `apps/storage-api/tests/**` (extend existing tests)
- Nothing else. Not `apps/api`, not `apps/console`, not `apps/couriers`, not
  `packages/`.

**Another agent is working in this repository concurrently.** Do not touch files
outside the scope above, do not run any `git` command, and do not "fix"
unrelated things you notice.

## The change

`apps/storage-api/domains/uploads/routes.py` currently declares exactly one
route. Add two more, following the existing one exactly:

```python
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

Add:

| Route key     | purpose       | owner_type | key_template                                      |
| ------------- | ------------- | ---------- | ------------------------------------------------- |
| `app.logo`    | `app_logo`    | `platform` | `apps/{owner_id}/branding/{file_id}/{version_id}` |
| `user.avatar` | `user_avatar` | `user`     | `users/{owner_id}/avatar/{file_id}/{version_id}`  |

### Why `app.logo` is `platform`-owned — decided, do not revisit

A first run of this brief correctly stopped and reported that `"app"` is **not**
a supported owner type or quota subject: `domains/uploads/schemas.py:8` allows
only `organization | user | platform`, and `domains/quotas/schemas.py:5` allows
only `organization | user`. That report was right, and the answer is **not** to
widen either union.

`owner_type="platform"` is already first-class and is exactly the right fit:

- It is accepted by the upload schema, the files schema, the files router
  filter, and serialization.
- `domains/uploads/quota.py:298` already **exempts** platform subjects from
  quota enforcement (`if subject_type == "platform": continue`), which matches
  `storage-architecture.md`: _"For `owner_type='platform'`, `limit_bytes` is
  `NULL` (unlimited)."_
- Semantically it is correct. 876's first-party apps (`876-console`,
  `876-couriers`, …) are not owned by any organization or user — 876 owns the
  Couriers logo. Charging a customer's storage pool for 876's own branding would
  be wrong.

So `app.logo` adds **no new concept**: no new owner type, no new quota subject,
no schema widening, no migration. `owner_id` is the app's opaque ID, giving keys
like `apps/app_xxx/branding/{file_id}/{version_id}`.

**Out of scope:** third-party/external OAuth apps registered by an organization,
whose logos would arguably be org-owned. Console's app management covers
first-party apps only. Do not build for that case; note it if you touch it.

Both take the **same** `allowed_content_types`, `max_size_bytes`, `category` and
`audience` as the org route. Specifically:

- `category="attachment"` — these hang off a business record. They must never
  appear in a browsable Drive listing and must not be user-renamable or
  deletable out from under the entity. **Not `library`.**
- `audience="public"` — world-readable, stable CDN URL, public bucket. This is
  the one pair the rule explicitly sanctions for a logo.
- `allowed_content_types=("image/png", "image/jpeg", "image/webp")` — **no
  SVG.** SVG is an active-content format and the rule forbids it until a
  sanitization step exists. Do not add it "for completeness".
- `max_size_bytes = 5 * 1024 * 1024`.

Both `"platform"` and `"user"` are already supported owner types, so no schema
change is required. Confirm that as you go, but it has been verified — see the
decision box above. **Do not widen `owner_type` or `QuotaSubjectType`.**

## Security notes you must not undo

- storage-api validates the **route policy** (type, size, MIME, opaque-ID
  shape). It deliberately does **not** verify that the caller owns the target
  resource — per `storage-architecture.md`, "Core verifies entitlement; the app
  verifies relationship." Do not add ownership checks here, and do not weaken
  the ones that exist.
- The client never supplies key, bucket, owner_type, category, audience or
  purpose — those come from the route. Keep it that way.
- Object keys stay server-generated from `key_template`. No filename, email, org
  name, or any client-controlled segment may enter a key.

## Tests

Extend the existing suite rather than starting a new file:

- `tests/test_architecture_invariants.py` already asserts on
  `UPLOAD_ROUTES["organization.primaryLogo"]`. Add equivalent assertions for the
  two new routes, and — better — make the invariant test iterate **every** route
  in `UPLOAD_ROUTES` so a future route cannot be added with `category="library"`,
  a `public`/SVG combination, or a client-controlled key segment without failing.
  That generalization is the most valuable part of this task.
- Add a case asserting SVG is rejected for the new routes.
- Add a case asserting an oversize file is rejected for the new routes.

## Verification — run each in the FOREGROUND and quote the real output

```bash
cd apps/storage-api && python -m pytest
cd apps/storage-api && python -m mypy . tests
cd apps/storage-api && python -m ruff check .
```

Do not summarize as "verification passed" — paste the tail of each. Two earlier
runs on this repo claimed success while typecheck was broken and 18 tests were
failing.

## Do not

- Do not commit, branch, stash, or run any `git` write command.
- Do not touch anything outside `apps/storage-api`.
- Do not add SVG, change `category`/`audience`, or introduce a client-supplied
  key segment.
- Do not implement the core-API columns, `@876/admin` methods, or Console UI —
  later sub-phases.

## Report back

1. The two route declarations you added, verbatim.
2. Confirmation that the `platform` owner path works end to end for an
   `app.logo` upload — accepted by the upload schema, exempt from quota
   admission, and serialized correctly — with `file:line` evidence.
3. The generalized invariant test, and what it now guarantees for future routes.
4. The real tail of all three verification commands.
