# Brief — document the new org app-provisioning model

**Tool:** `agy`, `claude-sonnet-4-6`
**Repo:** `/workspaces/876`, branch `fix/org-app-provisioning` (already checked out)
**Author:** Opus 5 (primary agent)

## Background — what just changed in the code

Until now, `provision_organization` hardcoded a single app: every new
organization got a subscription to `876-enterprise` and nothing else. An org
that registered through Couriers therefore had no Couriers subscription, and the
Couriers onboarding page 404'd on its own subscription lookup.

The new model, now implemented in `apps/api/services/provisioning.py`:

- **Default apps, provisioned for every org**: `876-enterprise` (where an org
  manages itself — account details, users, teams, departments) and
  `876-billing` (its financial plane — invoices, payment methods, the customer
  registry). The constant is `DEFAULT_ORG_APP_SLUGS`.
- **Plus the app the org signed up through.** `provision_org_apps` takes
  `source_app_id`, threaded from `domains/auth/router.py` →
  `services/auth.py: register_business`.
- **The source app is taken from the API key the request authenticated with**
  (`request.state.app_id`), not from anything the client sends — so an app
  cannot claim to be a different app.
- Provisioning is idempotent and never fails a signup: a missing app row is
  logged as `provisioning.default_app_missing` and skipped.

The intent, in the product owner's words: like a Google account, where signing
up reaches Drive, Photos and Calendar by default, while heavier surfaces stay
behind explicit setup. More apps join the default set as they mature.

## Your task

Update the two places that describe provisioning so they match the code.

### Files you may modify — nothing else

1. `.claude/rules/platform-services.md`
2. `docs/` — add `docs/org-provisioning.md` (new file)

Do **not** touch `apps/`, `packages/`, or any other rule file. Do not commit,
stage, branch or stash.

### 1. `.claude/rules/platform-services.md`

Find the passage describing org→app provisioning. It currently states that
new-org sign-up auto-provisions in `auth/complete` when `source=register` is
set. **That is now wrong in two ways**: there is no `source` field in the auth
schemas at all, and provisioning happens in `register_business` via the
authenticated app id.

Correct that passage. Keep it to the same terse register the rest of the file
uses — a short paragraph plus, where it helps, a table. State:

- the default set (`DEFAULT_ORG_APP_SLUGS` = enterprise + billing) and why each
  is a default;
- that the originating app is additionally provisioned, identified by the
  request's API key rather than a client-supplied field, and why that matters;
- that provisioning is idempotent and non-fatal.

Do not delete the surrounding `subscriptions` guidance — it is still accurate.

### 2. `docs/org-provisioning.md`

A short operational doc. Read
`apps/api/services/provisioning.py`, `apps/api/services/auth.py`
(`register_business` and `_register_or_adopt_workos_user`), and
`apps/api/core/platform_apps.py` before writing. Required `##` sections:

1. **What an organization gets on creation** — the default apps table (slug,
   what it is, why it is a default), plus the source app.
2. **How the source app is determined** — the API-key path, and the reason it
   is not a client-supplied parameter.
3. **Idempotence and partial environments** — repeat calls provision nothing;
   a missing app row logs `provisioning.default_app_missing` and is skipped
   rather than failing the signup.
4. **Adding an app to the default set** — the one-line change to
   `DEFAULT_ORG_APP_SLUGS`, and the caution that it grants the app to every
   _new_ org but does not backfill existing ones.
5. **Backfilling an existing org** — state plainly that there is no script for
   this yet and that it is done through Console's provisioning controls or a
   one-off call to `provision_org_apps`. Do not invent a script name.

## House style

- Match `docs/cloudflare.md` for tone and formatting: lead with the fact, no
  filler, tables for field/meaning pairs, identifiers in backticks, file
  references repo-relative.
- Under 120 lines.
- **Document only what the code does.** Take every constant, slug, function and
  log-event name from the source. If something in this brief contradicts the
  code, follow the code and say so in your report.

## Verification before you report done

```bash
cd /workspaces/876
npx prettier --check .claude/rules/platform-services.md docs/org-provisioning.md
grep -n "DEFAULT_ORG_APP_SLUGS\|provision_org_apps\|provisioning.default_app_missing" apps/api/services/provisioning.py
```

Prettier must pass (`--write` if not), and every identifier you wrote must
appear in that grep output or elsewhere in the source. `git status --short`
must show exactly one modified and one new file.

Report: what you changed, the checks you ran, and anything where the code
disagreed with this brief.
