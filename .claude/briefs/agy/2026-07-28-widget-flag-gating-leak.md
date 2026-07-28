# Brief — BUG: a disabled widget still renders in 876 Couriers

**Tool:** `agy` (`gemini-3.1-pro-high`)
**Repo:** `/workspaces/876`
**Do not commit. Do not open a PR.** The orchestrator stages and commits.
**Do not touch `apps/console`, `packages/widgets/src/react/`, or anything under
`apps/widgets-api`** — other phases own those files right now.

---

## 1. The report

A human disabled the Notepad widget for the **876 Couriers** application from
the Console admin UI. The widget **still renders** in Couriers, in local dev
**and** in production on Cloudflare Workers. That is a security-relevant
correctness bug: an admin turned something off and it stayed on.

## 2. What has already been ruled out — do not redo this work

I already read these paths end to end. Do not spend your budget re-deriving
them; start from hypothesis 1 in §4.

- `apps/couriers/src/lib/features.ts` — calls
  `platform.features.evaluate({ appSlug, userId, organizationId })`, builds
  `enabledSlugs` from the response, then
  `isWidgetEnabled(notepadWidgetMetadata, 'couriers', enabledSlugs)`. Reads
  correct. On any error it returns `DISABLED_FEATURES` (fail-closed).
- `packages/widgets/src/catalog.ts` — `getRequiredWidgetFeatureSlugs(notepad,
'couriers')` returns **all four** of `platform_widgets`,
  `platform_widgets_notepad`, `couriers_widgets`, `couriers_widgets_notepad`,
  and `isWidgetEnabled` requires **every** one to be present. Correct and
  fail-closed.
- `packages/widgets/src/react/widget-dock.tsx` — filters renderers by
  `enabledWidgetIds` and returns `null` when empty and chat is off. Correct.
- `apps/couriers/src/components/couriers-shell.tsx` — renders the dock when
  `enabledWidgetIds.length > 0 || uiFeatures.chat`. The dock itself still
  filters, so chat-only renders no widget triggers. Correct.
- **Only one render path exists.** `CouriersShell` is used solely by
  `apps/couriers/src/app/org/[orgSlug]/layout.tsx`. That layout reads cookies,
  so it is dynamically rendered — this is not Next.js full-route caching.

Conclusion: every layer I could read statically is fail-closed. The defect is
therefore in **flag evaluation on the API side** or in the **stored flag
state**. That is where you start.

## 3. The evaluation code you must understand first

Read `apps/api/services/features.py`, method `FeatureService.evaluate`
(around lines 417–484), and `apps/api/db/repositories/features.py`, method
`list_evaluation_features` (around line 264). The essential logic:

```python
features = await self.features.list_evaluation_features(app.id if app else None)
# -> WHERE archived_at IS NULL AND (app_id = :app_id OR app_id IS NULL)

for feature in features:
    if "widget" in feature.tags:
        decisions[feature.id] = feature.default_value      # <-- (A)
    elif uses_plan and feature.app_id is not None:
        ...
    else:
        decisions[feature.id] = feature.enabled            # <-- (B)

# org grants then user grants overwrite decisions[...]
# finally:
allowed = bool(feature.enabled and decisions.get(feature.id, False))
# ...AND-ed with resolve(parent) up the parent chain
```

Note line (A): **widget-tagged flags take their decision from `default_value`,
not `enabled`.** Every other flag uses `enabled` at line (B). `enabled` is
still AND-ed in at the end, so on paper toggling `enabled` off should still
disable a widget. Verify that on paper claim against the real code — I may
have mis-read an early-return or a tag check.

## 4. Ranked hypotheses — work them in this order, and prove or kill each one

For **every** hypothesis, write down the concrete evidence (file:line, or the
actual queried row) that proves or kills it. "Looks fine" is not evidence.

**H1 — The Console toggle writes a flag that is not one of the four required
slugs.** `apps/console/src/components/widgets/widget-catalog.ts` has
`getConsoleWidgetStatusFeatureSlug()`, which returns
`platformKeys?.widget ?? hostKeys?.widget` — i.e. the **platform** flag for a
shared widget. So the `/widgets` list page toggles `platform_widgets_notepad`,
while `/apps/876-couriers/widgets` toggles `couriers_widgets_notepad`. Confirm
which flags exist and which one a Couriers-scoped disable actually writes. A
plausible defect: the admin disabled the app-scoped flag but evaluation never
consults it.

**H2 — `default_value` diverges from `enabled` for widget flags.** Read
`apps/api/services/feature_seeds.py` and find exactly what `enabled` and
`default_value` are seeded to for `couriers_widgets` and
`couriers_widgets_notepad`. Then check whether **any** Console code path
updates `default_value` — grep for it. If the Console toggle only ever writes
`enabled` while evaluation for widget-tagged flags reads `default_value`, work
out precisely which combinations leak. Write the truth table out.

**H3 — The flag rows are not tagged `widget`,** so they fall to branch (B) or
into the `uses_plan` module-gating branch. Couriers is `app_kind == "product"`
and the call passes an `organization_id`, so `uses_plan` is **True** for
Couriers and False for Console — meaning Couriers takes a code path Console
never exercises. Read that branch very carefully:

```python
root_id = root_feature_id(feature)
decisions[feature.id] = (
    root_id in module_feature_ids if root_id in gated_feature_ids else feature.enabled
)
```

Ask: what happens when the widget flag's root is an `ApplicationModule` flag
and the org's plan includes that module? Could a **plan/module grant
re-enable** a flag an admin disabled? Check whether `feature.enabled` is
genuinely still AND-ed for this branch in the final `resolve()`.

**H4 — `parent_feature_id` drift.** Children must AND with their master. If
`couriers_widgets_notepad.parent_feature_id` is NULL, the master toggle stops
governing the child *in evaluation*. (`isWidgetEnabled` would still require
the master slug to be present, so state clearly whether this can leak on its
own or only in combination.)

**H5 — Archived/duplicate rows.** `list_evaluation_features` filters
`archived_at IS NULL`. Check for **two rows with the same slug**, one archived
and one not, or a duplicate created by the Console ad-hoc flag-creation path.
A duplicate enabled row would win.

## 5. How to get real data

You cannot fix this from static reading alone — I already tried. Get the
actual rows:

- The API is FastAPI at `apps/api`. Start it if it is not running:
  `cd /workspaces/876/apps/api && python -m uvicorn main:app --port 4000`
- Admin routes need the `x-internal-key` header matching `API_INTERNAL_KEY`.
  Look in `apps/api/.env` / `.env.local` for the value. **Never print a secret
  into your final report.**
- `GET /features?includeTag=widget&limit=100` lists widget flags with
  `enabled`, `default_value`, `tags`, `app_id`, `parent_feature_id`,
  `archived_at`.
- `GET /features/evaluate?appSlug=876-couriers&userId=…&organizationId=…`
  returns exactly what Couriers sees.
- If the API cannot be started or has no database, **say so plainly in your
  report** and fall back to writing failing tests that encode each hypothesis
  (see §6). Do not invent findings.

## 6. What to deliver

1. **A root-cause statement** naming the exact file:line and the exact stored
   state that produce the leak. If more than one defect exists, list them all.
2. **A minimal fix.** Confine changes to `apps/api/` (most likely
   `services/features.py` and/or `services/feature_seeds.py`). If the correct
   fix requires changing `packages/widgets/`, **do not make it** — describe it
   in the report instead; another phase owns that package.
3. **Regression tests in `apps/api/tests/`** that fail before your fix and pass
   after. Follow `.claude/rules/testing.md`:
   - Assert the **complete** evaluation result, not `assert result is not None`.
   - One test per hypothesis you confirmed.
   - Cover the exact reported scenario: widget enabled globally, disabled for
     the Couriers app, evaluated with a Couriers `appSlug` + `organizationId` →
     the widget flag **must not** appear in the response.
   - Cover the inverse (enabled everywhere → it does appear), so the test can
     actually fail in both directions.
4. If the root cause is stored data rather than code, still add the test that
   pins the intended semantics, and say clearly what data must be corrected.

## 7. Verify before reporting done

```
cd /workspaces/876/apps/api
python -m pytest
python -m mypy . tests
python -m ruff check .
```

All three must pass. Report the actual output, not a summary of it.

## 8. Rules to read first

- `.claude/rules/api-backend.md` — router/schema/docs layering, `AppHTTPException`
- `.claude/rules/feature-flags.md` — key format, parent/child semantics
- `.claude/rules/testing.md` — the assertion standard above

## 9. Honesty requirement

If you cannot reproduce the bug, say so explicitly and report which hypotheses
you eliminated with what evidence. A truthful "not reproduced, H1/H2 killed,
H3 is the remaining candidate because X" is far more useful than a speculative
fix. **Do not claim a fix you have not proven with a test that fails without
it.**
