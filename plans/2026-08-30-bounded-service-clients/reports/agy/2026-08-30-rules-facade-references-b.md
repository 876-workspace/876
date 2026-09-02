# Rules Facade Reference Migration Report (Batch B)

Date: 2026-08-30
Author: agy

## Summary

As part of ADR 020 (`020-bounded-service-clients-and-application-bffs.md`), repository documentation has been updated to remove legacy `$876` mega-facade references in favor of bounded service clients (`workspace`, `platform`, `crm`, `work`, `billing`, `storage`, `couriers`, `widgets`) and caller authority entrypoints, while retaining `$876` where it genuinely refers to the 876 Account client.

All edits have been mirrored across `.claude/rules/` and `.agents/rules/`.

## Scope and Mention Counts

| File                                    | Mentions Changed | Mentions Left Unchanged | Total Mentions |
| --------------------------------------- | ---------------- | ----------------------- | -------------- |
| `.claude/rules/feature-flags.md`        | 0                | 1                       | 1              |
| `.claude/rules/shared-product-ui.md`    | 1                | 2                       | 3              |
| `.claude/rules/storage-architecture.md` | 1                | 0                       | 1              |
| `.claude/rules/new-app-guide.md`        | 4                | 3                       | 7              |
| **Total**                               | **6**            | **6**                   | **12**         |

---

## Details by File

### 1. `feature-flags.md`

- **Mentions Changed**: 0
- **Mentions Left Unchanged**: 1

#### Unchanged Mentions

- **Line 16**:
  - **Text**: `- **Apps evaluate** through \`workspace.features.evaluate({ appId, userId })\` —`
  - **Reason**: The line already uses the bounded service client `workspace.features` in accordance with ADR 020.

---

### 2. `shared-product-ui.md`

- **Mentions Changed**: 1
- **Mentions Left Unchanged**: 2

#### Changed Mentions

- **Lines 106–107**:
  - **Old Text**:
    ```markdown
    3. Load the data in the host, through its own `$876` facade at its own access
       tier, and pass plain props.
    ```
  - **New Text**:
    ```markdown
    3. Load the data in the host, through its own bounded service client at its
       caller authority, and pass plain props.
    ```

#### Unchanged Mentions

- **Line 47**:
  - **Text**: `- **data loading** — no \`$876\`, no service client, no \`fetch\`. Hosts load and pass plain props.`
  - **Reason**: Under ADR 020, `$876` means the Account client. Shared UI packages must not perform data loading via `$876` (Account), bounded service clients, or `fetch`. The mention of both `$876` and `service client` is accurate.
- **Line 72**:
  - **Text**: `transpilePackages: sharedTranspilePackages(['@876/account', '@876/core']),`
  - **Reason**: The package list already specifies `@876/account` (replacing legacy `@876/sdk`).

---

### 3. `storage-architecture.md`

- **Mentions Changed**: 1
- **Mentions Left Unchanged**: 0

#### Changed Mentions

- **Lines 38–39**:
  - **Old Text**:
    ```markdown
    - Storage references core entities (`user_…`, `org_…`, `app_…`) as **opaque ID
      columns with no cross-DB foreign key**, resolving details through `$876`.
    ```
  - **New Text**:
    ```markdown
    - Storage references core entities (`user_…`, `org_…`, `app_…`) as **opaque ID
      columns with no cross-DB foreign key**, resolving details through `workspace` and `platform`.
    ```

---

### 4. `new-app-guide.md`

- **Mentions Changed**: 4
- **Mentions Left Unchanged**: 3

#### Changed Mentions

- **Lines 160–161** (2 mentions):
  - **Old Text**:
    ```markdown
    Initialize one client per app and export it as `$876` from `src/lib/876.ts`,
    then call `$876.<resource>.<verb>()` directly. Never a raw `fetch` to the API,
    ```
  - **New Text**:
    ```markdown
    Initialize bounded service clients under `src/lib/` for the domains the app uses,
    then call `<domain>.<resource>.<verb>()` directly. Never a raw `fetch` to the API,
    ```
- **Line 170** (1 mention):
  - **Old Text**:
    ```markdown
    through a thin route handler that authorizes and then calls `$876` — **no server
    ```
  - **New Text**:
    ```markdown
    through a thin route handler that authorizes and then calls the service client — **no server
    ```
- **Line 261** (1 mention):
  - **Old Text**:
    ```markdown
    directly — it resolves user/org details through `$876`.
    ```
  - **New Text**:
    ```markdown
    directly — it resolves user/org details through `workspace` and `platform`.
    ```

#### Unchanged Mentions

- **Line 166**:
  - **Text**: `| Consumer / first-party | \`@876/account\` | app API key or session cookie | server + browser |`
  - **Reason**: Already specifies `@876/account`.
- **Line 167**:
  - **Text**: `| Platform admin | \`@876/platform\` | \`API_INTERNAL_KEY\` (\`x-internal-key\`) | **server only** |`
  - **Reason**: Already specifies `@876/platform`.
- **Line 312**:
  - **Text**: `| Client | \`$876\` in server components | \`create876Client\` + \`credentials: 'include'\` | \`create876Client\` on native HTTP |`
  - **Reason**: Section 11 specifically outlines auth flows and identity API calls, where `$876` and `create876Client` represent the 876 Account client.

---

## Mirroring Confirmation

All four files have been verified to be byte-identical between `.claude/rules/` and `.agents/rules/`:

1. `feature-flags.md`:
   - `.claude/rules/feature-flags.md` (6,893 bytes, 137 lines)
   - `.agents/rules/feature-flags.md` (6,893 bytes, 137 lines)
   - Status: **Identical**
2. `shared-product-ui.md`:
   - `.claude/rules/shared-product-ui.md` (5,704 bytes, 131 lines)
   - `.agents/rules/shared-product-ui.md` (5,704 bytes, 131 lines)
   - Status: **Identical**
3. `storage-architecture.md`:
   - `.claude/rules/storage-architecture.md` (21,498 bytes, 396 lines)
   - `.agents/rules/storage-architecture.md` (21,498 bytes, 396 lines)
   - Status: **Identical**
4. `new-app-guide.md`:
   - `.claude/rules/new-app-guide.md` (13,411 bytes, 317 lines)
   - `.agents/rules/new-app-guide.md` (13,411 bytes, 317 lines)
   - Status: **Identical**
