# Naming Rules

Use clear short names. Avoid cryptic abbreviations.

## Canonical Replacements

| Current        | Preferred                                                                       |
| -------------- | ------------------------------------------------------------------------------- |
| Authentication | Auth                                                                            |
| Authorization  | Auth (OAuth identity flows), Authz / Permission / Access / Policy (permissions) |
| Organization   | Org                                                                             |
| Configuration  | Config                                                                          |
| Parameters     | Params                                                                          |
| Properties     | Props                                                                           |
| Application    | App                                                                             |
| Database       | Db                                                                              |
| Identifier     | Id                                                                              |
| Context        | Ctx                                                                             |
| Request        | Req — internal/local names only                                                 |
| Response       | Res — internal/local names only                                                 |

## Auth vs Authz Decision Tree

- Identity, login, sessions, "who are you?" → **Auth**
- Permissions, access control, "what are you allowed to do?" → **Authz**, Permission, Access, or Policy

## Hard No-Rename List

Never rename accidentally:

- API route paths and URL slugs
- Database table names and column names
- Migration filenames and migration code
- Environment variable names
- External provider payload fields (WorkOS, Stripe, BetterAuth, etc.)
- Exported package names and npm entry points
- Test snapshot files (unless intentionally updating)
- Stable string literals used as error codes, event names, or protocol tokens
- `object` discriminator values (`'user'`, `'list'`, `'search_result'`, etc.)

**Note:** 876-owned JSON response fields are _not_ frozen. They must be camelCase (see below). Renaming them as part of a coordinated camelCase migration is correct — renaming them arbitrarily or in isolation is not.

## TypeScript casing

All 876-owned TypeScript identifiers and app-owned JSON contract properties use **camelCase**.

**Good:**

```ts
userId
organizationId
createdAt
hasMore
startingAfter
emailVerified
firstName
```

**Do not introduce:**

```ts
user_id // ❌
organization_id // ❌
created_at // ❌
has_more // ❌
starting_after // ❌
```

This applies to: TS variables, functions, object properties, Zod fields, JSON request/response bodies, query parameters, Express route params, serializer output, OpenAPI property names, SDK inputs, and SDK-returned resources.

**Exceptions — these keep their native convention:**

| Surface                    | Convention                                  |
| -------------------------- | ------------------------------------------- |
| DB tables / columns        | snake_case (leave unchanged)                |
| Prisma `@map` / `@@map`    | required bridge — do not remove             |
| Migrations / raw SQL       | database convention                         |
| Environment variables      | SCREAMING_SNAKE_CASE                        |
| External provider payloads | provider's native naming                    |
| Standard HTTP headers      | standard HTTP spelling                      |
| Error code strings         | stable opaque identifiers — do not rename   |
| `object` token values      | stable protocol strings — do not rename     |
| Python service internals   | snake_case; normalize at TS client boundary |

## Intentional vs. accidental renames

An accidental rename is one that breaks a contract without a coordinated migration.
An intentional rename is one that updates **all** of: the API schema, serializer,
SDK types, OpenAPI doc, contract manifest, tests, and every first-party call site
in the same coordinated change.

camelCase migrations of 876-owned wire fields are intentional renames. Do not
introduce dual-casing compatibility aliases (`createdAt ?? created_at`) — that
turns a cleanup into a permanent compatibility layer.

## When to Stop

Only rename when the shorter name is still immediately understandable without opening the implementation.

Do not over-shorten:

```ts
// Good shortening
getAuthenticationVerificationToken() → getAuthVerificationToken()

// Too cryptic — do not rename
getPasswordResetVerificationToken() → getPwdResetVerifToken()  ❌
```

When in doubt, keep the longer name.
