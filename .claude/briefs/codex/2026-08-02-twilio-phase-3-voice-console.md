# Codex brief — Twilio Phase 3: Programmable Voice and the Console log

**Model:** gpt-5.6-terra, high reasoning. **Repo:** `/workspaces/876`.
**Branch:** `feat/twilio-voice-console` — already created and checked out, with
Phases 1 and 2 committed in its history.

**Read first:** `docs/plans/twilio-communications.md` and the code as it now
stands. Phase 2 was reviewed and changed after you wrote it — do not undo any of
this:

- `normalize_phone_number` now lives in `apps/api/core/phone.py`, not in
  `domains/mobile_numbers/service.py`. Import it from `core.phone`.
- `apps/api/core/lookup_cache.py::resolve_cached_lookup` is the **only**
  sanctioned path to the Lookup provider. Never call `create_lookup` directly.
- `MobileNumberService` holds `self._lookup_repo` so the cache is injectable in
  tests; `CommunicationsService.lookup` delegates to the same resolver.
- `save_lookup` returns the instance from `merge()`, not the detached input.
- `TwilioClient` is pooled per credential pair via `_shared_client` and closed by
  `close_shared_clients()` in the app lifespan.

Also read `.claude/rules/api-backend.md`, `.claude/rules/app-layout.md` (for the
Console page), `.claude/rules/sdk-conventions.md`, and `.claude/rules/code-style.md`.

## 1. Programmable Voice

Follow plan §10 "Voice" exactly.

- `communication_calls` model in `db/models/communications.py` (register it in
  `db/models/__init__.py`) with the fields in plan §7, plus repository verbs in
  `db/repositories/communications.py` alongside the message verbs.
- `VoiceProvider` is already declared in `providers/communications.py`. Implement
  it on the Twilio adapter against the Calls API, form-encoded, using
  `TWILIO_VOICE_FROM_NUMBER`. Extend `FakeTwilioProvider` to match so tests need
  no network.
- `POST/GET /communications/calls` under `AdminDep`, in the existing
  `domains/communications/` domain.

### The security-critical part — read twice

**A caller supplies a `template_key` and never TwiML, never a URL.** The service
resolves that key to a signed 876-hosted TwiML endpoint. A caller-supplied URL or
raw TwiML body would let anyone with admin access make the platform's Twilio
account read arbitrary content down a phone line, so:

- Reuse the server-owned registry pattern already in
  `domains/communications/service.py::TEMPLATES` — add a `VOICE_TEMPLATES` map
  from key to TwiML content. Unknown key ⇒ `communications/invalid-template`
  **before** any provider call.
- The TwiML endpoint (`POST /webhooks/twilio/voice`) lives in
  `domains/twilio_webhooks/` on the public router, validates the Twilio signature
  like every other webhook there, and returns TwiML generated from the named
  template only. It must never echo a request parameter into the TwiML body.
- Calls use only `TWILIO_VOICE_FROM_NUMBER`; a caller cannot choose the sender.
- Recording stays off. Do not add a recording parameter, flag, or column.

### Call status callbacks

`POST /webhooks/twilio/calls/status`, reusing the dedupe and ranking machinery
from Phase 2. Ranking for calls: `queued < initiated < ringing < in-progress <
completed`, with `completed`, `busy`, `no-answer`, `canceled`, and `failed`
terminal. Same rule as messages — a late non-terminal callback must never
overwrite a terminal status. Store `duration_seconds` and `answered_at` when the
completed callback provides them.

`POST /webhooks/twilio/calls/inbound` is a **scaffold only**: validate the
signature, record the webhook event, return empty TwiML. Do not build call
routing.

## 2. Console communications log

A read-only operational view. Follow `.claude/rules/app-layout.md` closely — this
is a Console list page and must reuse the existing shell, not invent one.

- Route `apps/console/src/app/(app)/communications/page.tsx`, standard container
  (`px-4 pt-5 pb-8 sm:px-6 lg:px-8`), `ResourceToolbar` with `refresh`, and a
  table.
- **No create button** — this surface never sends anything. Omit `primaryLabel`.
- Columns: recipient (masked, tier 1), channel, status (a `<Badge>`, never
  coloured text), template key, app/org, and created (tier 3, muted). Numbers use
  `tabular-nums`. Empty values render an em dash.
- Status filtering uses `StatusFilterHeading` as `titleFilter`, with the status
  threaded into the list call server-side — never filter rows in the page.
- Data comes through `$876` from `@876/admin` in a server component
  (`$876.messages.list`, and the calls equivalent you add). No raw fetch.
- **Recipients are masked in the UI.** Reuse the platform's masking rather than
  printing full numbers into an admin screen.
- Add a `calls.list`/`calls.retrieve` pair to `@876/admin` matching the messages
  resource shape.

Keep the page read-only: no retry button, no resend, no cancel in this phase.

## 3. Documentation

Update `docs/twilio-activation.md` **only** where voice changes it — do not
rewrite it. It already documents `TWILIO_VOICE_FROM_NUMBER` and the activation
order; add nothing that duplicates the runbook.

## Out of scope

Phone-first auth, inbound call routing, recording, marketing/bulk messaging,
manual retry, and production activation.

## Hard constraints

- Everything stays disabled by default; `TWILIO_VOICE_ENABLED` defaults false and
  a disabled channel returns `communications/channel-disabled` before any
  provider call.
- No caller-supplied TwiML, URL, or sender.
- No recording.
- No browser-reachable call or message creation.
- Do not add `src/proxy.ts` or `middleware.ts` to any Next.js app.
- **Do not modify `pnpm-lock.yaml`** unless you genuinely add a JS dependency —
  the sandbox regenerates it with different peer resolution and that churn is not
  committable.
- No green buttons; status colour belongs to badges only.

## Verification — all must pass before reporting done

```bash
cd /workspaces/876/apps/api && ./.venv/bin/python -m ruff check . \
  && ./.venv/bin/python -m mypy core/ domains/ db/ providers/ tests/test_communications.py \
  && ./.venv/bin/python -m pytest -q
cd /workspaces/876 && pnpm --filter @876/admin typecheck && pnpm --filter @876/admin test \
  && pnpm --filter @876/console typecheck
```

578 API tests pass today; expect that plus yours. Use `./.venv/bin/python` —
there is no `python` on PATH. `mypy . tests` fails on a pre-existing
duplicate-module issue; use the targeted form above.

Required test coverage: template-key rejection before any provider call, that no
caller input can reach the TwiML body, out-of-order and replayed call status
callbacks, terminal-status protection, the disabled-channel gate, and that the
fake voice provider is used with no network access.

## Reporting

**Do not commit and do not branch** — the orchestrating agent owns all git.
Report every file added or changed, the exact verification output, and anything
you could not implement as specified with the reason, rather than deviating
silently. If you cannot finish the Console page, say so plainly — a complete
voice implementation with an honest gap is worth more than both half-done.
