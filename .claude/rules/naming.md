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

Never rename:

- API route paths and URL slugs
- Database table names and column names
- Migration filenames and migration code
- Environment variable names
- External provider payload fields (WorkOS, Stripe, BetterAuth, etc.)
- Public JSON response fields consumed by clients
- Exported package names and npm entry points
- Test snapshot files (unless intentionally updating)
- String literals used as keys, event names, or identifiers

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
