# Sensitive Field Encryption

## What is encrypted

The `user_identifications` table holds sensitive government-issued identifiers. The following columns store the encrypted form:

| Column             | Type        | Meaning                                                                 |
| ------------------ | ----------- | ----------------------------------------------------------------------- |
| `value_ciphertext` | `Text`      | Provider-prefixed ciphertext of the normalized identifier value.        |
| `value_key_id`     | `String`    | Key identifier returned by the provider, when applicable.               |
| `value_provider`   | `String`    | Provider name that produced the ciphertext (`local_aesgcm`, etc.).      |
| `value_last4`      | `String(4)` | Last four characters of the normalized value, stored in the clear.      |
| `value_hash`       | `String`    | HMAC-SHA256 of the normalized value under `IDENTIFICATION_HASH_PEPPER`. |

Legacy rows written before encryption was introduced still carry plaintext in `value`. New rows leave `value` empty and write `value_ciphertext` instead; `value` stays in the schema until the backfill has sealed every row and a follow-up migration drops it.

The account PIN is **hashed** (scrypt), not encrypted. A PIN is verified by re-deriving and comparing; it is never read back in plaintext, so one-way hashing is appropriate and correct. See [PIN hashing](#pin-hashing) below.

---

## The two providers

Provider selection is controlled by settings at startup in `apps/api/core/secure_field.py` (`get_secure_field_provider`):

1. **WorkOS Vault** (`wv1:` prefix) — used in production when `WORKOS_VAULT_ENABLED=true` and a Vault client is injected. The plaintext enters Vault's encrypt endpoint and never leaves this process unencrypted; key material never enters the process at all. Ciphertext is stored as `wv1:<vault-ciphertext>`.

2. **Local AES-256-GCM** (`la1:` prefix) — used in development and CI when `SECURE_FIELD_KEY` is set to a base64-encoded 32-byte key. This is a real cipher, not a stub: dev and production differ in key custody, not in whether values are encrypted. Ciphertext is stored as `la1:<base64-nonce>.<base64-ciphertext>`.

If `WORKOS_VAULT_ENABLED` is true and a vault client is available, Vault is chosen regardless of whether `SECURE_FIELD_KEY` is also set. If only `SECURE_FIELD_KEY` is set, `LocalAesGcmProvider` is used. See [Configuration](#configuration) for what happens when neither is set.

---

## Context binding

Every seal and unseal operation receives a `context` map of `{"user_id": ..., "type": ...}`. This map is **authenticated associated data (AAD)** — it is cryptographically bound to the ciphertext by both providers, but never stored inside it.

The practical consequence: a ciphertext row copied from one user's record onto another user's record fails to decrypt. The context for the source row (`{"user_id": "usr_A", "type": "trn"}`) does not match the context presented at unseal time (`{"user_id": "usr_B", "type": "trn"}`), so the operation raises `SecureFieldError` rather than returning a value. This prevents a class of privilege-escalation bugs where a database manipulation grants access to another account's identifier without touching the encryption key.

---

## Failure behaviour

`_UnconfiguredProvider` in `apps/api/core/secure_field.py` is the provider used when neither `WORKOS_VAULT_ENABLED` nor `SECURE_FIELD_KEY` is configured. Its `seal` method raises:

```
SecureFieldError: No secure field provider is configured. Set SECURE_FIELD_KEY or enable WORKOS_VAULT_ENABLED.
```

Storing plaintext when a key is missing would be the worst possible failure mode — it looks like success and leaves unencrypted identifiers in the database. The unconfigured provider makes misconfiguration loud instead.

---

## Masking and duplicate detection

**Masking** — `masked_identification_value` in `apps/api/services/identification_secrets.py` returns a fixed-width bullet string followed by the last three characters of the value (taken from `value_last4`). The mask is always four bullets wide (`MASK_WIDTH = 4`), regardless of the value's length. A variable-width mask would disclose the identifier's length, which is itself a distinguishing detail (a nine-digit TRN and a six-character passport number should not be told apart from a masked read).

The common read path uses `value_last4` directly and never needs the decryption key.

**Duplicate detection** — `compute_identification_hash` in `apps/api/services/identification_secrets.py` computes `HMAC-SHA256(key=IDENTIFICATION_HASH_PEPPER, message="{type}:{normalized_value}")`. Duplicate checks compare `value_hash` against a freshly computed hash of the incoming value. Matching never decrypts anything. The pepper prevents offline reversal of the hash: the identifier space (e.g. nine-digit TRNs) is small enough to enumerate, so a bare hash could be reversed from a database copy.

---

## Configuration

| Variable                     | Default | Effect when unset                                                                   |
| ---------------------------- | ------- | ----------------------------------------------------------------------------------- |
| `WORKOS_VAULT_ENABLED`       | `false` | Vault provider is not selected; falls through to `SECURE_FIELD_KEY`.                |
| `WORKOS_VAULT_KEY_CONTEXT`   | `"876"` | Namespace passed to Vault alongside the AAD context.                                |
| `SECURE_FIELD_KEY`           | `""`    | Local AES-GCM provider is not selected; falls through to `_UnconfiguredProvider`.   |
| `IDENTIFICATION_HASH_PEPPER` | `""`    | `compute_identification_hash` raises `SecureFieldError`; duplicate detection fails. |

With neither `WORKOS_VAULT_ENABLED` nor `SECURE_FIELD_KEY` set, any attempt to seal a new identification value raises `SecureFieldError` and the write is aborted. Existing rows with a `value_ciphertext` cannot be unsealed either.

---

## Backfilling

`apps/api/scripts/encrypt_user_identifications.py` seals existing plaintext rows. It is idempotent: a row that already has `value_ciphertext` is skipped, so a failed run can be repeated without double-encrypting anything.

```bash
# Report only — no writes
python scripts/encrypt_user_identifications.py

# Seal all plaintext rows
python scripts/encrypt_user_identifications.py --apply

# Clear the legacy plaintext column (separate, later run only)
python scripts/encrypt_user_identifications.py --apply --clear-plaintext
```

`--clear-plaintext` requires `--apply` and zeros `value` on rows that already have `value_ciphertext`.

**Run `--clear-plaintext` as a separate, later pass.** Seal everything first, verify that disclosure still works against the sealed column, and only then clear the original. Clearing in the same pass as sealing leaves no way back if the key was misconfigured: the script would write ciphertext and then immediately destroy the only copy of the plaintext, with no window to detect a bad key.

---

## PIN hashing

Account PINs are hashed with scrypt via `hash_pin` in `apps/api/core/pin.py`. Parameters:

| Parameter     | Value                   |
| ------------- | ----------------------- |
| `N`           | `32768` (`2**15`)       |
| `r`           | `8`                     |
| `p`           | `1`                     |
| Salt          | 16 random bytes per row |
| Output length | 32 bytes                |
| `maxmem`      | `128 * N * r * 2` bytes |

The stored hash format is `scrypt$N$r$p$<base64-salt>$<base64-hash>`. `verify_pin` reads parameters back from the stored string so raising the cost factor later does not invalidate existing hashes.

**`maxmem` must be set explicitly.** scrypt at `N=32768, r=8` needs roughly `128 × N × r = 32 MiB` of memory, which is exactly OpenSSL's default cap. Without the explicit `maxmem` override (`_MAXMEM = 128 * SCRYPT_N * SCRYPT_R * 2`), every hash call fails with a memory-limit-exceeded error.

**Lockout policy**: after `MAX_FAILED_ATTEMPTS = 5` consecutive wrong PINs, the account is locked for `LOCKOUT_SECONDS = 900` seconds (15 minutes). `is_locked` in `apps/api/core/pin.py` checks the `locked_until` timestamp. PIN failures are also recorded as `pin_verify` / `failed` auth attempts, so a guessing run appears in the same history as password failures.
