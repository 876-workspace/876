# Brief: document the cross-organization operator list pattern (Phase 4)

You are doing DOCS-ONLY work. Do not run typecheck/lint/test — this is
markdown-only. Do not touch any `.ts`/`.tsx` file.

## Context

This repo just landed the first concrete instance of a "cross-organization
operator list" capability, described but not yet built in
`plans/2026-09-03-console-workspace-and-sidebar/plan.md` §3.3 and Phase 4. The
plan's own words: "Prove the pattern, document it, and stop." The pattern is
now proven (CRM requests). Your job is the "document it" half.

The concrete implementation that was just landed, so you can read the real
code instead of guessing:

- `apps/crm-api/src/modules/requests/requests.repository.ts` — the
  cross-organization query (soft-delete-safe, bounded cursor pagination,
  selects the owning organization id per row).
- `apps/crm-api/src/modules/requests/requests.routes.ts` and
  `requests.controller.ts` — `GET /v1/requests`, gated by `requireInternal`
  (the internal-key admin tier, not a per-org tier).
- `packages/crm/src/operator.ts` and
  `packages/crm/src/resources/operator-requests.ts` — the operator-only typed
  client method `requests.listAcrossOrganizations()`.
- `apps/console/src/lib/services/crm.ts` — the Console-side
  `listRequestsAcrossOrganizations()` wrapper.
- `apps/console/src/app/(app)/requests/all/page.tsx` and
  `_components/all-requests-table-data.tsx` — the Console page, at
  `/requests/all`, following `.claude/rules/data-loading.md` (chrome renders
  immediately, the table streams behind a `Suspense` boundary with a
  `DataTableSkeleton`) and `.claude/rules/app-layout.md` §5 (status filter via
  `StatusFilterHeading` + the existing `isRequestStatus`/`REQUEST_STATUS_OPTIONS`
  helpers in `apps/console/src/features/crm/request-status.ts` — reused as-is,
  not duplicated).

Read all of those files before writing anything — the doc must describe what
the code actually does, not a generic restatement of the plan.

## What to write

### 1. Extend `docs/architecture/017-console-app-data-management.md`

Read the whole file first — it already has a "Registering a new service
capability in Console" section (a numbered how-to) and a "Registering a
product's workspace surface" section. Add a NEW section after "Registering a
new service capability in Console" (before "Registering a product's workspace
surface") titled something like "Cross-organization operator lists" that:

- States the shape of the capability: a product's owning service adds an
  ADMIN/internal-tier list route with NO organization scoping in the path,
  returning rows from every tenant, each row carrying its own organization id
  so Console can attribute and link back into that organization's workspace.
- Names `GET /v1/requests` in `apps/crm-api` as the reference implementation,
  with the concrete file list from the Context section above (use real
  `file:line`-free paths, e.g. `apps/crm-api/src/modules/requests/requests.routes.ts`,
  not paraphrases).
- States explicitly that this is the SAME `requireInternal`/admin guard
  Console already uses elsewhere in that service — not a new auth mechanism —
  and that the repository layer reuses the same soft-delete-safe filter
  builder as the existing org-scoped list (do not let a reader think this is
  a parallel, less-safe query path).
  point at `/workspace/[orgSlug]/<product>` for that row's organization) so a
  future product implementing this pattern does not skip it.
- Adds one line to the file's "Do not" list: do not build a cross-org list
  endpoint that skips the soft-delete filter or omits the owning organization
  id from each row.

Also: check whether the file's "The pathway" section (near the top, the
5-step `1. capability … 5. surface` list) still says a facade step composes
onto "Console's server `$876`". If it does, that is now factually wrong per
`.claude/rules/sdk-conventions.md` and `.claude/rules/workspace-control-plane.md`
— there is no `$876` aggregator; Console composes explicit bounded roots under
`src/lib/services/` (`platform`, `workspace`, `billing`, `crm`, …). If you find
that stale wording, correct step 4 to describe composing onto the owning
domain module under `src/lib/services/` instead — do not invent new
terminology, match the phrasing already used in "Registering a new service
capability in Console" step 4 of the same file. If it's already been
corrected, skip this and say so in your report.

### 2. Update the plan's handoff state

Edit `plans/2026-09-03-console-workspace-and-sidebar/plan.md`:

- In §8 "Phase 4 — cross-org operations (thin)", check off the two boxes that
  are now true:
  - "For **one** product only (recommend CRM requests) wire a real cross-org
    operator list end to end…" — DONE, name the commits/files.
  - "Prove the pattern, document it, and stop." — DONE once your doc section
    above exists; reference it.
  - Leave "No analytics/statistics work in this run" as a standing constraint
    note, not a checkbox to check.
- In §12 "Handoff state", table row "4 — cross-org operator list" — change
  from "🔄 Codex running, see below" to "✅ complete", and update the
  "Two other agents are in this working tree" section: the Codex Phase 4 slice
  already landed (find the actual commit hashes with
  `git log --oneline -8 -- apps/crm-api/src/modules/requests apps/console/src/app/'(app)'/requests/all packages/crm/src/resources/operator-requests.ts`
  and cite them), so remove item "2. Codex (`gpt-5.6-terra`, medium) — Phase 4,
  running as of 02:55" and replace it with a short "done" note citing those
  commits and this doc.
- Keep the "Another Claude session — Phase 3.5, uncommitted" section EXACTLY
  as it is — do not edit it, do not speculate about whether it finished. You
  have no way to know its live state; just leave that paragraph untouched.
- In "What is genuinely left", update item 1 ("Land Codex's Phase 4 slice; add
  the nav entry + permission key **after** Phase 3.5 lands") to reflect that
  the Phase 4 slice itself has landed and only the nav-entry/permission-key
  follow-up (deferred until Phase 3.5 lands) remains.
- Do not touch item 2 or item 3 in "What is genuinely left" — leave them as
  written.

## Do NOT touch

- Any `.ts`/`.tsx` file, anywhere.
- The "Another Claude session — Phase 3.5" paragraph in the plan (see above).
- `docs/architecture/018*` or any other architecture doc not named above.

## Report

Write a short completion note as your final response (no separate report file
needed for this one) listing exactly which files you edited and a one-line
summary of each edit.
