# Rules Facade Reference Migration Report (Batch A)

Date: 2026-08-30
Author: agy

## Summary

As part of ADR 020 (`docs/architecture/020-bounded-service-clients-and-application-bffs.md`), repository rule files have been updated to replace passing legacy `$876` mega-facade references with bounded service clients (`workspace`, `platform`, `crm`, `work`, `billing`, `storage`, `couriers`, `widgets`), while retaining `$876` where it genuinely refers to the 876 Account client.

All edits have been applied identically across `.claude/rules/` and `.agents/rules/`.

## Scope and Mention Counts

| File                                     | Mentions Changed | Mentions Left Unchanged | Total Mentions |
| ---------------------------------------- | ---------------- | ----------------------- | -------------- |
| `.claude/rules/app-access.md`            | 0                | 2                       | 2              |
| `.claude/rules/app-layout.md`            | 2                | 1                       | 3              |
| `.claude/rules/app-structure.md`         | 0                | 1                       | 1              |
| `.claude/rules/billing-data-plane.md`    | 1                | 0                       | 1              |
| `.claude/rules/customer-architecture.md` | 0                | 2                       | 2              |
| `.claude/rules/data-loading.md`          | 0                | 3                       | 3              |
| **Total**                                | **3**            | **9**                   | **12**         |

---

## Details by File

### 1. `app-access.md`

- **Mentions Changed**: 0
- **Mentions Left Unchanged**: 2

#### Unchanged Mentions

- **Line 99** (2 mentions):
  - **Text**: `- Do not put admin-tier endpoints into \`@876/account\`; they belong in \`@876/platform\` and the appropriate control-plane composer.`
  - **Reason**: The line already uses the bounded service package names `@876/account` and `@876/platform` per ADR 020. The rule correctly specifies that admin-tier operations belong in the operator plane (`@876/platform`) rather than the account client (`@876/account`).

---

### 2. `app-layout.md`

- **Mentions Changed**: 2
- **Mentions Left Unchanged**: 1

#### Changed Mentions

- **Line 173**:
  - **Old Text**:
    ```markdown
    - `status` absent, or `status=all`, means **no status filter** — pass
      `undefined` to the `$876` (or app service) call, not the literal string
      `"all"`.
    ```
  - **New Text**:
    ```markdown
    - `status` absent, or `status=all`, means **no status filter** — pass
      `undefined` to the service client (or app service) call, not the literal string
      `"all"`.
    ```
- **Line 242**:
  - **Old Text**:
    ```tsx
    const result = await $876.widgets.list({
      limit: 25,
      starting_after: after,
      ending_before: before,
      status: widgetStatus,
    })
    ```
  - **New Text**:
    ```tsx
    const result = await widgets.widgets.list({
      limit: 25,
      starting_after: after,
      ending_before: before,
      status: widgetStatus,
    })
    ```

#### Unchanged Mentions

- **Line 7**:
  - **Text**: `This does **not** apply to \`@876/app\` (the consumer app) — it has its own`
  - **Reason**: Refers to the consumer web application (`@876/app`), not a service client or facade reference.

---

### 3. `app-structure.md`

- **Mentions Changed**: 0
- **Mentions Left Unchanged**: 1

#### Unchanged Mentions

- **Line 198**:
  - **Text**: `| \`876.ts\` or \`876/\` | every app | the \`$876\` singleton (see \`.claude/rules/sdk-conventions.md\`) |`
  - **Reason**: Under ADR 020, `$876` is retained as the 876 Account client singleton. `src/lib/876.ts` or `src/lib/876/` hosts this singleton for account and identity operations across apps.

---

### 4. `billing-data-plane.md`

- **Mentions Changed**: 1
- **Mentions Left Unchanged**: 0

#### Changed Mentions

- **Line 51**:
  - **Old Text**:
    ```markdown
    with no cross-database foreign key. Console resolves both sides through `$876`
    and presents them as one screen; that composition is a Console concern, not a
    schema one.
    ```
  - **New Text**:
    ```markdown
    with no cross-database foreign key. Console resolves both sides through `workspace` and `billing`
    and presents them as one screen; that composition is a Console concern, not a
    schema one.
    ```

---

### 5. `customer-architecture.md`

- **Mentions Changed**: 0
- **Mentions Left Unchanged**: 2

#### Unchanged Mentions

- **Line 121** (2 mentions):
  - **Text**: `Client surface: \`AdminDep\` ⇒ \`@876/platform\` (\`platform.users.identifications._\`) and the platform client (\`platform.users.identifications._\`) only — never \`@876/account\` (auth-tier gating rule). Consumer self-service goes through the owning app's session-guarded route handler calling the platform client.`
  - **Reason**: Already specifies the ADR 020 bounded packages `@876/platform` and `@876/account`, enforcing that sensitive identification endpoints belong to `@876/platform` rather than `@876/account`.

---

### 6. `data-loading.md`

- **Mentions Changed**: 0
- **Mentions Left Unchanged**: 3

#### Unchanged Mentions

- **Line 20**:
  - **Text**: `layout containers. Live data includes HTTP service calls through \`$876\`, typed`
  - **Reason**: Refers to HTTP service reads made via the 876 Account client `$876` alongside typed SDK/admin clients, which is valid under ADR 020.
- **Line 42**:
  - **Text**: `  const result = await billing.customers.list({ limit: 25 })`
  - **Reason**: Already updated to use the bounded `billing.customers.list` client call (the canonical worked example).
- **Line 50**:
  - **Text**: `  const result = await billing.customers.list({ limit: 25 })`
  - **Reason**: Already updated to use the bounded `billing.customers.list` client call.

---

## Mirroring Confirmation

All six files are confirmed byte-identical between `.claude/rules/` and `.agents/rules/`:

1. `app-access.md`:
   - `.claude/rules/app-access.md` (5,825 bytes, 105 lines)
   - `.agents/rules/app-access.md` (5,825 bytes, 105 lines)
   - Status: **Identical**
2. `app-layout.md`:
   - `.claude/rules/app-layout.md` (26,425 bytes, 606 lines)
   - `.agents/rules/app-layout.md` (26,425 bytes, 606 lines)
   - Status: **Identical**
3. `app-structure.md`:
   - `.claude/rules/app-structure.md` (13,002 bytes, 265 lines)
   - `.agents/rules/app-structure.md` (13,002 bytes, 265 lines)
   - Status: **Identical**
4. `billing-data-plane.md`:
   - `.claude/rules/billing-data-plane.md` (17,739 bytes, 316 lines)
   - `.agents/rules/billing-data-plane.md` (17,739 bytes, 316 lines)
   - Status: **Identical**
5. `customer-architecture.md`:
   - `.claude/rules/customer-architecture.md` (17,368 bytes, 275 lines)
   - `.agents/rules/customer-architecture.md` (17,368 bytes, 275 lines)
   - Status: **Identical**
6. `data-loading.md`:
   - `.claude/rules/data-loading.md` (9,484 bytes, 223 lines)
   - `.agents/rules/data-loading.md` (9,484 bytes, 223 lines)
   - Status: **Identical**
