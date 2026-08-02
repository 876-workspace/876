# Codex brief — Twilio Phase 1 follow-up: the missing domain test coverage

**Model:** gpt-5.6-terra, high reasoning. **Repo:** `/workspaces/876`.
**Branch:** `feat/twilio-verification` — already checked out, Phase 1
implementation already staged in the working tree. Do **not** branch or commit.

You implemented Phase 1 in the previous run and correctly reported this gap:

> the new mobile-verification tests do not yet include DB-integrated ownership,
> resend/attempt-state, one-primary, or transaction-rollback cases

Close it. **This run is tests only** — do not restructure the implementation.

## Context: two defects were fixed after your run

`apps/api/domains/mobile_numbers/service.py` was edited by the reviewer. Read it
before writing tests; do not revert either change:

1. **The resend counter is now windowed.** `send_count` carries forward from the
   previous verification only when `previous.last_sent_at > now - _SEND_WINDOW_SECONDS`
   (24h). Previously it carried for the life of the row, which made
   `communications/rate-limited` a permanent lockout — a number that ever hit 5
   sends could never be verified again, because nothing decayed the stored count.
2. **`enforce_rate_limit` for sends moved** to immediately before the provider
   call, after the cooldown and send-count checks, so a caller bounced by the
   60-second cooldown no longer burns its own daily quota.

Both need regression tests (see below).

## Required tests — `apps/api/tests/test_mobile_number_verification.py`

Keep the five existing tests. Add DB-integrated cases using the same fixtures and
async client style as the existing API tests (`tests/api/`) — find the established
session/app fixture pattern and reuse it rather than inventing one. Run with
`TWILIO_MODE=fake` and the relevant channel flags on so `FakeTwilioProvider`
serves the provider calls; **no test may touch the network**.

**Ownership and isolation**

- User B cannot retrieve, update, delete, make-primary, create a verification for,
  or approve a verification on user A's mobile number — each returns 404, and the
  row is unchanged afterwards.
- `approve_verification` rejects a `verification_id` belonging to a different
  mobile number of the _same_ user.

**One primary per user**

- Making a second number primary clears `is_primary` on the first — assert
  exactly one row has `is_primary` true.
- The partial unique index rejects a direct second-primary insert (drive it
  through the repository/session, asserting the integrity error) — this proves the
  DB constraint exists, not just the service rule.
- Approving with `make_primary=true` sets `users.phone` and
  `users.phone_verified`, and a later approval on a different number moves both.
- Deleting the primary number clears `users.phone` and `users.phone_verified`.
- `make_primary` on an unverified number returns `communications/number-not-verified`.

**Resend and attempt state**

- A second send inside 60s returns `communications/verification-pending` (429).
- After the cooldown, a send succeeds and `send_count` increments.
- The 5th send in the window succeeds; the 6th returns
  `communications/rate-limited`.
- **Regression for fix 1:** with a previous verification whose `last_sent_at` is
  older than 24h and whose stored `send_count` is at the cap, a new send is
  _allowed_ and the counter restarts at 1.
- **Regression for fix 2:** a send rejected by the cooldown does not consume the
  daily quota — after the cooldown passes, the full remaining quota is still
  available. Use `reset_rate_limits()` from `core/rate_limit.py` between tests.
- Wrong code returns `communications/verification-failed` and increments
  `attempt_count`; the 5th wrong code returns
  `communications/max-attempts-reached` and sets status `failed`.
- An expired verification returns `communications/verification-expired` and marks
  the row `expired`.

**Transaction integrity**

- If the database update fails during approval (patch the repository or the
  `User` fetch to raise after the provider returns `approved`), nothing is
  persisted: the number stays unverified, `users.phone` is unchanged, and no audit
  event row is written.
- A successful approval writes exactly one `mobile_number.verification_approved`
  audit event, and its properties contain no code.

**No OTP persisted (strengthen the existing check)**

- After a full send → approve cycle with a known fake code, assert that code
  string appears in **no** column of the `verifications` row — including `value`
  and `metadata_`.

## Verification — must pass before reporting done

```bash
cd /workspaces/876/apps/api && ./.venv/bin/python -m ruff check . \
  && ./.venv/bin/python -m mypy domains/mobile_numbers/ tests/test_mobile_number_verification.py \
  && ./.venv/bin/python -m pytest tests/test_mobile_number_verification.py -q
```

Then the full suite: `./.venv/bin/python -m pytest -q` (expect 558 + your new
tests, all passing).

Notes: there is no `python` on PATH — use `./.venv/bin/python`. `mypy . tests`
fails on a **pre-existing** duplicate-module/`utils/security_helpers.py` issue
unrelated to this work; use the targeted invocation above and do not try to fix it.

## Reporting

Do not commit, do not branch. Report: each test added and what it proves, any
case you could not write and why (rather than silently dropping it), and the exact
output of the verification commands.
