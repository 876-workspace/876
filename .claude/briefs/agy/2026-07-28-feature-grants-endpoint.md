# Mission — make a feature's overrides readable in one call

**Tool:** `agy` (`gemini-3.1-pro-high`)
**Repo:** `/workspaces/876`, branch `feat/api-feature-grants`
**Do not commit, push, or open a PR.** The orchestrator does that.

---

## 0. How to work this brief

This is a **goal**, not a checklist. You are done when every gate in §5 is
green — not when you have touched the files in §3. Work in a loop:

> implement → run **all** gates → read the failures → fix → run **all** gates
> again → repeat.

**Do not stop while any gate is red.** Do not report success with a failing
gate and an explanation. If a gate stays red after three honest attempts,
report exactly which one, the verbatim failure, and what you tried — that is a
good outcome. A false green is the only unacceptable one.

Before you report, run the self-review in §6 against your own diff and fix
whatever it catches. Budget real time for that step; it is where quality comes
from.

---

## 1. The goal, in one sentence

**Given a feature ID, return every organization and user override attached to
that feature, with enough identity detail to render each one, in a single
request.**

## 2. Why this does not exist yet, and why it matters

The API exposes overrides only from the principal's side:

- `GET /features/organizations/{organization_id}/features`
- `GET /features/users/{user_id}/features`

There is no way to ask "who has an override on *this* flag?". Console's access
UI therefore does the only thing it can: it lists **every organization and
every user in the platform**, then checks each one for a grant. That is the
concrete defect you are removing. It does not scale, and it buries the two or
three principals that actually carry an override under hundreds that do not.

The new Console UI shows *only* real overrides, with a search box to add one.
It needs exactly one endpoint. That endpoint is your goal.

## 3. Shape of the work

Follow `.claude/rules/api-backend.md` strictly — it is the law for this
directory. Router, schemas, and docs are **three separate files** and logic
does not live in the router.

- `apps/api/db/repositories/features.py` — two queries: org grants for a
  feature, user grants for a feature. Eager-load the related `Organization` /
  `User` with `selectinload` so serialization does not trigger a query per row.
  **An N+1 here is a failed gate** (see §5.5).
- `apps/api/services/features.py` — a method on `FeatureService` that verifies
  the feature exists (reuse `require_feature`, which already raises the correct
  `AppHTTPException`) and returns both lists.
- `apps/api/domains/features/schemas.py` — the response models.
- `apps/api/domains/features/docs.py` — summary, description, responses. Docs
  prose lives here, **never** in the router. Keep the alphabetical grouping and
  the `*_SUMMARY`, `*_DESCRIPTION`, `*_RESPONSES` ordering the file already uses.
- `apps/api/domains/features/router.py` — the route, `AdminDep`, wiring only.
- `apps/api/tests/` — tests.

### Route

`GET /features/{feature_id}/grants`, `AdminDep`.

**Placement matters and is easy to get wrong.** `router.py` already has
`GET /features/evaluate` declared *before* `GET /features/{feature_id}` — that
ordering is deliberate, because FastAPI matches in declaration order and
`/features/evaluate` would otherwise be swallowed by `/features/{feature_id}`.
Your route has a literal suffix so it is not ambiguous, but keep it adjacent to
the other `/{feature_id}` routes and re-read the file after editing to confirm
you have not broken the existing ordering.

### Response

Follow the platform contract in `.claude/rules/stripe-api-pattern.md`: every
serialized resource carries a literal `object` discriminator, timestamps are
Unix seconds, and lists use `ListObject`.

```
{
  "object": "feature_grants",
  "feature_id": "ftr_...",
  "organizations": { "object": "list", "data": [ ... ], "has_more": false, "url": "..." },
  "users":         { "object": "list", "data": [ ... ], "has_more": false, "url": "..." }
}
```

Each organization entry:

```
{ "object": "org_feature_grant", "id", "organization_id", "feature_id",
  "slug", "status", "note", "organization_name", "organization_slug",
  "organization_logo_url", "created_at", "updated_at" }
```

Each user entry:

```
{ "object": "user_feature_grant", "id", "user_id", "feature_id",
  "slug", "status", "note", "user_email", "user_first_name",
  "user_last_name", "user_username", "user_avatar", "created_at", "updated_at" }
```

Reuse the existing `OrgFeatureResponse` / `UserFeatureResponse` field names
where they already exist (`id`, `organization_id`/`user_id`, `feature_id`,
`slug`, `status`, `note`, `created_at`, `updated_at`) — look at
`_serialize_org_feature` and `_serialize_user_feature` in `router.py` and stay
consistent with them. The identity fields are the new part.

**Do not paginate.** A single flag having more than a few hundred overrides
would be pathological; `has_more` is present for contract consistency and is
always `false`. Say so in the docs description.

**Do not invent a name field by concatenating.** Return the raw identity
fields and let the client compose the display name — the client already has a
`userLabel` helper and its own formatting rules.

## 4. Explicitly out of scope

- Do **not** touch `apps/console`, `packages/`, or any other app.
- Do **not** modify `FeatureService.evaluate`, the grant/revoke routes, or the
  existing serializers' shapes.
- Do **not** add a migration or change any model.
- Do **not** add caching.

## 5. Gates — every one must be green

Run all of them, every loop, from `/workspaces/876/apps/api`. Use the
project venv: `.venv/bin/python`.

1. `.venv/bin/python -m pytest` — full suite, **zero** failures. There were
   489 passing before you started; you must not reduce that number.
2. `.venv/bin/python -m mypy . tests` — `Success: no issues found`.
3. `.venv/bin/python -m ruff check .` — `All checks passed!`.
4. **Your tests fail without your fix.** After they pass, *temporarily* revert
   your `repositories`/`services` change, re-run your new tests, and confirm
   they now **fail**. Restore, re-run, confirm green. **Paste both outputs in
   your report.** A test that passes with the feature removed is not a test —
   this gate exists because a previous task shipped a change that could not
   alter any observable behaviour and nobody noticed.
5. **No N+1.** Your test must prove the identity data is eager-loaded, not
   lazily fetched per row — assert on the query construction (that
   `selectinload` is applied) or assert the awaited call count. State in your
   report how you proved it.
6. **OpenAPI is valid.** The app imports and the schema builds:
   `.venv/bin/python -c "from main import app; app.openapi()"` exits 0.

## 6. Self-review before you report

Read your own diff and answer each, in writing, in your report:

- Could any line I added be deleted with **no** observable behaviour change?
  If yes, delete it.
- Is there prose in `router.py` that belongs in `docs.py`?
- Does every new serialized object carry its `object` discriminator?
- Does a request for a non-existent feature ID return the existing
  `feature/not-found` 404 rather than an empty result or a 500?
- Does a feature with **zero** overrides return two empty lists (not `null`,
  not a 404)?
- Did I hand-roll anything the repository layer already does?
- Would a reviewer who knows this codebase call any part of this "clever"? If
  so, make it boring.

## 7. Tests to write

In `apps/api/tests/`, following `.claude/rules/testing.md` — every assertion
must be able to fail, and assert whole shapes with equality rather than
`is not None`:

- A feature with both org and user overrides returns both, with identity fields
  populated, and the exact `object` discriminators.
- A feature with no overrides returns two empty lists and `has_more: false`.
- An unknown feature ID returns 404 `feature/not-found`.
- A non-admin request (missing `x-internal-key`) is rejected — mirror how the
  existing admin-route tests assert this.
- Both `enabled` and `disabled` grant statuses round-trip correctly, so a
  mutation of the status field is caught.

## 8. Report

1. The gate output for all six, verbatim.
2. The §5.4 revert proof, both directions.
3. Your written answers to §6.
4. Anything you chose to do differently from this brief, and why.

## 9. Honesty contract

Report only what you observed. If something is broken and you could not fix
it, name it precisely. Never describe a command as passing unless you ran it
and read its output. A partial result reported accurately is worth far more
than a complete-sounding one that is wrong.
