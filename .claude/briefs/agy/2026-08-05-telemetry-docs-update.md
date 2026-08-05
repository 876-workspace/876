# Brief — bring the auth-telemetry docs up to date

**Tool:** `agy`, `claude-sonnet-4-6`
**Repo:** `/workspaces/876`, branch `feat/auth-device-telemetry`
**Author:** Opus 5 (primary agent)

## Your task

`docs/auth-telemetry.md` documents only the original data-capture plane. Three
more phases have shipped since. Update that file, and add one new file
documenting the encryption of sensitive identifiers.

## Files you may create or modify — nothing else

- **Modify** `docs/auth-telemetry.md`
- **Create** `docs/sensitive-field-encryption.md`

Do not touch `apps/`, `packages/`, or any other file. Do not commit or stage.

## Ground rules

- **Document only what the code does.** Read every file listed below before
  writing about it. Take column names, endpoint paths, setting names and
  defaults from the source, never from memory or from this brief's prose.
- If the code contradicts this brief, follow the code and say so in your report.
- Match the existing tone: lead with the fact, no marketing language, no
  "In this document we will…", tables over paragraphs for field/meaning pairs,
  every identifier in backticks, every file reference repo-relative.

## Part 1 — update `docs/auth-telemetry.md`

Read first:

- `apps/api/domains/devices/router.py`, `domains/auth_attempts/router.py`,
  `domains/sessions/router.py` — the admin endpoints and their exact paths.
- `apps/api/core/risk.py` — the scoring rules, weights and the
  `should_block` threshold behaviour.
- `apps/api/services/auth_telemetry.py` — how risk is gathered and what is
  sent to PostHog.
- `apps/api/domains/auth/me_schemas.py` and the `/me/devices`, `/me/sessions`
  routes at the end of `apps/api/domains/auth/router.py`.
- `packages/sdk/src/resources/auth.ts` — the `me` block.
- `apps/api/core/config.py` — the new settings and their defaults.

Changes to make:

1. Replace the **"Not yet built"** section. Admin endpoints, Console UI, risk
   scoring and PostHog emission now exist; WorkOS Vault key custody in
   production is the main thing genuinely outstanding.
2. Add an **"Admin API"** section: a table of every device / auth-attempt /
   session endpoint with its method, path and one-line purpose. State that all
   of them are `AdminDep`.
3. Add a **"Self-service API"** section: the three `/auth/me/*` endpoints and
   the `$876.auth.me.*` SDK methods. Explain the key point — the session tier
   deliberately omits the device fingerprint and IP address, because a
   fingerprint identifies a device across accounts and both are
   fraud-investigation data. Note that this is what lets any app in the
   ecosystem build an account-security screen without the internal key.
4. Add a **"Risk scoring"** section: the weights table taken from
   `core/risk.py`, the 15-minute failure window, and — state this plainly —
   that **enforcement is off**: `AUTH_RISK_BLOCK_THRESHOLD` defaults to `0`
   and nothing is ever blocked at that value.
5. Add an **"Analytics"** section: the `auth_attempt` PostHog event, and that
   the raw IP and the submitted identifier are never sent (the IP goes as a
   salted digest), with `$geoip_disable` set.
6. Update the **event vocabulary** table — `pin_verify` now exists.
7. Update the **Console** references: device data lives on a user's Security
   tab (`/users/[username]/security`), and `/security` holds only the two
   cross-account views (sign-ins, sessions). There is deliberately **no**
   Console devices list page.

## Part 2 — create `docs/sensitive-field-encryption.md`

Read first: `apps/api/core/secure_field.py`,
`apps/api/services/identification_secrets.py`,
`apps/api/scripts/encrypt_user_identifications.py`,
`apps/api/core/identifications.py`, `apps/api/core/pin.py`.

Required sections, in this order:

1. **What is encrypted** — which columns on `user_identifications`, and that
   the PIN is _hashed_ (scrypt) rather than encrypted, because it is verified
   and never read back.
2. **The two providers** — WorkOS Vault and local AES-256-GCM, how one is
   selected, and the `wv1:` / `la1:` ciphertext prefixes.
3. **Context binding** — the `{user_id, type}` map is authenticated associated
   data, so a row copied onto another user fails to decrypt. Say why that
   matters.
4. **Failure behaviour** — with no provider configured, sealing raises rather
   than storing plaintext.
5. **Masking and duplicate detection** — reads use `value_last4` so the common
   path never needs the key; duplicates compare HMACs under
   `IDENTIFICATION_HASH_PEPPER` so matching never decrypts. Note the mask is
   fixed-width so it does not disclose the value's length.
6. **Configuration** — a table of every relevant env var, its default, and
   what happens when it is unset.
7. **Backfilling** — how to run `scripts/encrypt_user_identifications.py`,
   why it is dry-run by default, and why `--clear-plaintext` should be a
   separate later run rather than part of the first pass.
8. **PIN hashing** — scrypt parameters, the lockout policy, and the `maxmem`
   detail (these parameters need more than OpenSSL's default 32 MiB cap, so it
   is set explicitly or every hash fails).

## Verification before you report done

```bash
cd /workspaces/876
npx prettier --check docs/auth-telemetry.md docs/sensitive-field-encryption.md
```

Run `npx prettier --write` on both if it fails. Then check every endpoint path
and setting name you wrote actually appears in the source — grep for each one.
`git status --short` must show one modified and one new file, both under
`docs/`.

Report: what you changed, the checks you ran, and anything where the code
disagreed with this brief.
