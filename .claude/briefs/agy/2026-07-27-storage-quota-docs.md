# Brief: document the 876 Storage quota and attribution model

## Context

876 Storage is gaining metered storage: per-organization pools, optional
per-member caps, plan-carried entitlements, and reservation-based enforcement.
The full design specification is in this repo at:

    .claude/briefs/codex/2026-07-27-storage-quotas-and-entitlements.md

Read sections 3 (quota and attribution model) and 4 (schemas and endpoints) of
that file in full. They are the source of truth for everything you write. Do
not invent behavior that is not in that file, and do not contradict it.

## Your task — documentation only, two deliverables

### 1. `docs/storage-quotas.md` (new file)

An operations runbook for engineers supporting this service. Cover:

- What the counters mean: `bytes_used` (verified ready files) vs
  `bytes_reserved` (open upload sessions) vs `files_count`, and why a
  reservation exists at all.
- Owner vs uploader attribution — usage counts against the file's **owner**;
  `created_by` records the **uploader** for visibility only. Use the
  organization-logo case as the worked example: the bytes hit the org pool,
  the uploader is still named.
- Pooled storage with optional member caps, and how the same two dials express
  both "one 5 GB pool for the whole org" and "per-user quotas".
- How to read a quota rejection in logs: the `storage.quota_rejected`,
  `storage.quota.missing_entitlement`, `storage.usage.underflow`, and
  `storage.usage.drift_repaired` events, and what each one means operationally.
- How to repair counter drift (`POST /v1/admin/usage/recompute`) and when to
  suspect it.
- How to grant an organization an override, and that overrides live in the
  core identity API — never in the Storage service, which is a pure follower
  with a single writer.
- How entitlements reach Storage: the `storage_entitlement_outbox` in
  `apps/api`, its worker, and the reconcile script.
- The environment variables involved: `STORAGE_DEFAULT_ORG_LIMIT_BYTES`,
  `STORAGE_NEAR_LIMIT_PERCENT` (Storage service), and `STORAGE_URL` /
  `STORAGE_INTERNAL_KEY` (identity API side).

### 2. A new "Quotas and attribution" section in `.claude/rules/storage-architecture.md`

Append it to the existing rule file, matching that file's established voice
exactly — it is terse, decisive, uses tables, and states rules as rules. Read
the whole existing file first and match it. Cover, tightly:

- The fixed vocabulary: quota subject, quota, usage, pool, member cap, owner,
  uploader. Include the "never call it X" warnings, in the style the file
  already uses for `category` / `audience` / "visibility".
- The admission rule (every applicable subject must have headroom).
- The reservation protocol in brief: reserve before signing, convert on
  verified completion, release on every terminal failure, exactly-once guard.
- Fail-to-default on a missing quota row, and why it is neither fail-open nor
  fail-closed.
- Soft delete releases quota immediately; the bytes are reclaimed
  asynchronously by the existing sweep.
- A short "Do not" list in the same style as the file's existing one.

**Then mirror that same new section into `.agents/rules/storage-architecture.md`
and `.grok/rules/storage-architecture.md`.** The root `CLAUDE.md` requires all
three trees to stay in sync. Adjust any relative rule links to use the mirror's
own directory prefix (`.agents/rules/` and `.grok/rules/` respectively), which
is how the existing files already handle it.

## Constraints

- **Documentation only.** Do not modify any `.py`, `.ts`, or `.tsx` file. Do
  not touch anything under `apps/` or `packages/`.
- **Do not run `git commit`, `git push`, or open a pull request.** Leave your
  changes in the working tree; the orchestrator stages and commits them.
- No AI attribution anywhere in what you write.
- Follow the repo's UI/prose conventions in `CLAUDE.md`: no filler, no
  restating the obvious, no wordy explanatory paragraphs where a table does
  the job.
- Markdown must survive `prettier` — the orchestrator runs it afterwards.

## Files you may touch

- `docs/storage-quotas.md` (create)
- `.claude/rules/storage-architecture.md` (append a section)
- `.agents/rules/storage-architecture.md` (mirror)
- `.grok/rules/storage-architecture.md` (mirror)

Nothing else.
