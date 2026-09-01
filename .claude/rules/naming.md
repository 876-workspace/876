# Naming Rules

Use clear short names. Avoid cryptic abbreviations.

## Platform Naming Contract

876 uses one ownership-based naming model across application code, APIs, SDKs,
persisted symbolic values, configuration catalogs, and databases.

> **Preserve provider/protocol spelling at its boundary, preserve the physical
> SQL schema, use camelCase for TypeScript and 876-owned JSON fields, and use
> kebab-case for 876-owned machine-readable string values.**

| Surface | Canonical format | Example |
| --- | --- | --- |
| TypeScript variables, properties, functions | `camelCase` | `organizationId`, `createdAt`, `createCustomer()` |
| Types, interfaces, classes | `PascalCase` | `CustomerCreateParams` |
| Zod schema variables | `camelCase` + `Schema` | `customerSchema` |
| Source files and directories | `kebab-case` | `customer-payments.ts`, `customer-payments/` |
| Next.js / 876 REST route segments | `kebab-case` | `/payment-terms`, `/sales-orders` |
| 876-owned JSON property names | `camelCase` | `hasMore`, `totalCount`, `createdAt` |
| 876-owned symbolic values | `kebab-case` | `in-progress`, `request-created`, `payment-intent` |
| 876 error codes | namespaced kebab-case | `billing/workspace-not-found` |
| Permission keys | `<kebab-module>.<kebab-action>` | `sales-orders.view`, `danger-zone.edit` |
| Feature-flag keys | app-prefixed kebab-case | `console-widgets-notes` |
| Environment variables | conventional `SCREAMING_SNAKE_CASE` | `DATABASE_URL` |
| Existing physical SQL tables/columns | preserve `snake_case` | `customer_payments`, `organization_id` |
| External provider/protocol fields and values | preserve exactly | WorkOS `email_verification_required`, OAuth `invalid_grant` |

Kebab-case applies to symbolic **values**, file names, and route segments. It does
not apply to JavaScript property identifiers. Use:

```ts
{
  createdAt: timestamp,
  status: 'in-progress',
}
```

not `{ 'created-at': timestamp }`.

## Ownership Classification

Before renaming any underscore-containing identifier, classify it:

1. **876-owned contract** — migrate to the canonical format above.
2. **Provider/protocol-owned** — preserve the raw value and translate at the
   provider/protocol boundary when an 876 representation is needed.
3. **Physical database identifier** — preserve the SQL name and expose camelCase
   through Prisma `@map` / `@@map`.
4. **User/org-authored data** — preserve unless an explicit product migration
   says otherwise.
5. **Historical/generated artifact** — preserve unless regeneration is
   authoritative and intentional.
6. **Transient infrastructure key** — migrate with a compatibility/drain
   strategy rather than a blind rename.

Never mass-replace `_` with `-`. Durable values use an explicit, reviewed
old→new migration map so provider data, customer data, hashes, and opaque IDs
cannot be changed accidentally.

## Canonical Replacements

| Current        | Preferred                                                                       |
| -------------- | ------------------------------------------------------------------------------- |
| Authentication | Auth                                                                            |
| Authorization  | Auth (OAuth identity flows), Authz / Permission / Access / Policy (permissions) |
| Organization   | Org                                                                             |
| Configuration  | Config                                                                          |
| Parameters     | Params                                                                           |
| Properties     | Props                                                                            |
| Application    | App                                                                              |
| Database       | Db                                                                               |
| Identifier     | Id                                                                               |
| Context        | Ctx                                                                              |
| Request        | Req — internal/local names only                                                 |
| Response       | Res — internal/local names only                                                 |

## Auth vs Authz Decision Tree

- Identity, login, sessions, "who are you?" → **Auth**
- Permissions, access control, "what are you allowed to do?" → **Authz**, Permission, Access, or Policy

## Durable Contract Rule

Persisted permission keys, module keys, feature slugs, status/event values,
error codes, route paths, and public JSON fields are durable contracts. That
means **do not rename them as an ordinary refactor**; it does not mean a bad
legacy convention is frozen forever.

A durable 876-owned contract may be renamed only through an explicit coordinated
migration that updates, as applicable:

- every producer and consumer;
- Zod/OpenAPI contracts and SDKs;
- persisted rows, arrays, JSON/JSONB, and enum values;
- seeds and provisioning manifests;
- feature-provider state such as PostHog;
- route/API compatibility aliases;
- tests and fixtures;
- observability/event consumers.

Compatibility reads may temporarily accept both old and new values, but new
writes must use the canonical value and the compatibility path must have a
planned removal point.

## Hard No-Rename List

Never rename these merely for style:

- existing physical database table names and column names;
- historical migration filenames or migration code;
- environment variable names;
- external provider payload fields and values (WorkOS, Stripe, Better Auth,
  Twilio, PostHog provider payloads, etc.);
- protocol-defined wire values such as OAuth error and grant values;
- exported package names and npm entry points;
- opaque IDs, tokens, signatures, hashes, idempotency keys, or other values whose
  bytes are semantically significant;
- existing storage object keys unless a dedicated object-copy/reference
  migration exists;
- user/org-authored custom keys, metadata, tags, filenames, or imported
  identifiers;
- historical audit values when the audit log is intentionally immutable;
- test snapshots unless the represented contract is intentionally changing.

## Database Boundary

The mature physical SQL schema is intentionally allowed to remain snake_case.
Prisma application fields are camelCase and map onto it:

```prisma
model CustomerPayment {
  organizationId String   @map("organization_id")
  createdAt      DateTime @map("created_at")

  @@map("customer_payments")
}
```

Do not rename physical tables/columns merely to make SQL look like TypeScript.
Stored **876-owned symbolic values** inside those columns are a different
contract and should be migrated to kebab-case when the migration is explicit.

## Provider And Protocol Boundaries

Raw provider/protocol values stay raw and are normalized once at the boundary:

```ts
const providerCode = 'email_verification_required' // WorkOS contract
const code = 'auth/email-not-verified' // normalized 876 contract
```

Provider DTOs may therefore contain snake_case. Do not spread raw provider DTOs
through internal application layers merely because the adapter receives them.

OAuth values such as `invalid_grant`, `invalid_client`, and `consent_required`
remain exactly as required when serialized on the OAuth wire. An internal 876
value may be kebab-case only when it is not itself the protocol value.

## When to Stop

Only shorten a name when the shorter form is still immediately understandable
without opening the implementation.

```ts
// Good shortening
getAuthenticationVerificationToken() → getAuthVerificationToken()

// Too cryptic — do not rename
getPasswordResetVerificationToken() → getPwdResetVerifToken()  ❌
```

When in doubt about ownership, preserve the value until it is classified rather
than guessing.
