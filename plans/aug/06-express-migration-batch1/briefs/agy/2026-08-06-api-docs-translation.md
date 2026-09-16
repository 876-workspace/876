# Brief: translate `apps/api/domains/*/docs.py` → `src/modules/*/**.docs.ts`

**Tool:** `agy` (gemini-3.6-flash-high)
**Task class:** mechanical translation with a hand-written worked example
**Reviewed by:** primary agent — every diff read, `pnpm node:typecheck` re-run

## Why this is delegated

These files are pure data: exported string and object constants holding OpenAPI
prose. No imports, no logic, no control flow, no decisions. 2759 lines across 21
files, ~773 constants. That is the exact shape `agy` handles well and the exact
shape it is wasteful for the primary agent to type out.

It is delegated **only because a worked example already exists** —
`src/modules/health/health.docs.ts` was hand-written first, so the target shape
is demonstrated rather than described.

## Task

Translate each `apps/api/domains/<domain>/docs.py` into
`apps/api/src/modules/<module>/<module>.docs.ts`.

### Transformation rules

| Python                                                                           | TypeScript                                                             |
| -------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `FOO_SUMMARY = "text"`                                                           | `export const FOO_SUMMARY = 'text'`                                    |
| `FOO_DESCRIPTION = """multi\nline"""`                                            | `export const FOO_DESCRIPTION = \`multi\nline\`` (template literal)    |
| `FOO_RESPONSES: dict[int \| str, dict[str, Any]] = {200: {"description": "X."}}` | `export const FOO_RESPONSES = { 200: { description: 'X.' } } as const` |
| `FOO_RESPONSES: dict = {}`                                                       | `export const FOO_RESPONSES = {} as const`                             |
| `status.HTTP_200_OK`                                                             | `200`                                                                  |
| `True` / `False` / `None`                                                        | `true` / `false` / `null`                                              |
| `from typing import Any` (and every other import)                                | **delete — these files import nothing**                                |

### Hard rules

1. **Constant names are copied character for character.** They are referenced by
   name from route files. Renaming one breaks the build.
2. **String contents are copied character for character** — same wording, same
   punctuation, same capitalisation, same trailing periods. This is
   documentation prose that ships in the public OpenAPI document; it is not to
   be improved, shortened, expanded, or reworded.
3. **Single quotes** for strings (repo Prettier config: `singleQuote: true`, no
   semicolons). Use a template literal when the string contains a single quote
   or spans lines.
4. **No imports in the output file.** `*.docs.ts` files import nothing — that is
   what keeps them reviewable on their own.
5. Every file starts with the header comment shown in the example.
6. **Do not create, edit, or delete any other file.** No route files, no schema
   files, no index files, no Python files.

## Worked example — copy this shape exactly

**Input** `apps/api/domains/geo/docs.py`:

```python
from typing import Any

LIST_CURRENCIES_SUMMARY = "List enabled currencies"
LIST_CURRENCIES_DESCRIPTION = "Returns all enabled currencies sorted by code."
LIST_CURRENCIES_RESPONSES: dict[int | str, dict[str, Any]] = {
    200: {"description": "Currencies returned."},
}

LIST_REGIONS_SUMMARY = "List regions for a country"
LIST_REGIONS_DESCRIPTION = "Returns enabled regions (parishes, states, etc.) for the given country code."
LIST_REGIONS_RESPONSES: dict[int | str, dict[str, Any]] = {
    200: {"description": "Regions returned."},
    404: {"description": "Country not found."},
}
```

**Output** `apps/api/src/modules/geo/geo.docs.ts`:

```ts
/**
 * OpenAPI prose for the Geo module. Pure data — this file imports nothing,
 * which is what keeps route files readable and documentation reviewable on its
 * own (.claude/rules/express-api.md).
 */

export const LIST_CURRENCIES_SUMMARY = 'List enabled currencies'

export const LIST_CURRENCIES_DESCRIPTION =
  'Returns all enabled currencies sorted by code.'

export const LIST_CURRENCIES_RESPONSES = {
  200: { description: 'Currencies returned.' },
} as const

export const LIST_REGIONS_SUMMARY = 'List regions for a country'

export const LIST_REGIONS_DESCRIPTION =
  'Returns enabled regions (parishes, states, etc.) for the given country code.'

export const LIST_REGIONS_RESPONSES = {
  200: { description: 'Regions returned.' },
  404: { description: 'Country not found.' },
} as const
```

A second reference, already committed and hand-written:
`apps/api/src/modules/health/health.docs.ts`.

## Files — every row must be produced

The module name is the domain name in kebab-case. The output directory may not
exist yet; create it.

| #   | Input                            | Output                                              | Constants |
| --- | -------------------------------- | --------------------------------------------------- | --------- |
| 1   | `domains/addresses/docs.py`      | `src/modules/addresses/addresses.docs.ts`           | 15        |
| 2   | `domains/apps/docs.py`           | `src/modules/apps/apps.docs.ts`                     | 42        |
| 3   | `domains/audit_events/docs.py`   | `src/modules/audit-events/audit-events.docs.ts`     | 6         |
| 4   | `domains/auth_attempts/docs.py`  | `src/modules/auth-attempts/auth-attempts.docs.ts`   | 9         |
| 5   | `domains/auth/docs.py`           | `src/modules/auth/auth.docs.ts`                     | 31        |
| 6   | `domains/communications/docs.py` | `src/modules/communications/communications.docs.ts` | 21        |
| 7   | `domains/devices/docs.py`        | `src/modules/devices/devices.docs.ts`               | 15        |
| 8   | `domains/directory/docs.py`      | `src/modules/directory/directory.docs.ts`           | 154       |
| 9   | `domains/features/docs.py`       | `src/modules/features/features.docs.ts`             | 40        |
| 10  | `domains/geo/docs.py`            | `src/modules/geo/geo.docs.ts`                       | 9         |
| 11  | `domains/memberships/docs.py`    | `src/modules/memberships/memberships.docs.ts`       | 16        |
| 12  | `domains/mobile_numbers/docs.py` | `src/modules/mobile-numbers/mobile-numbers.docs.ts` | 24        |
| 13  | `domains/modules/docs.py`        | `src/modules/modules/modules.docs.ts`               | 8         |
| 14  | `domains/oauth/docs.py`          | `src/modules/oauth/oauth.docs.ts`                   | 17        |
| 15  | `domains/onboarding/docs.py`     | `src/modules/onboarding/onboarding.docs.ts`         | 10        |
| 16  | `domains/organizations/docs.py`  | `src/modules/organizations/organizations.docs.ts`   | 173       |
| 17  | `domains/products/docs.py`       | `src/modules/products/products.docs.ts`             | 27        |
| 18  | `domains/provisioning/docs.py`   | `src/modules/provisioning/provisioning.docs.ts`     | 12        |
| 19  | `domains/sessions/docs.py`       | `src/modules/sessions/sessions.docs.ts`             | 12        |
| 20  | `domains/users/docs.py`          | `src/modules/users/users.docs.ts`                   | 131       |

`domains/health/docs.py` is already done — do not touch it.

## Do NOT touch

- Any `.py` file (read them; never edit them)
- Any file under `src/http/`, `src/config/`, `src/platform/`, `src/db/`
- `src/modules/health/**`
- Any `*.routes.ts`, `*.schemas.ts`, `*.service.ts`, `*.repository.ts`, `index.ts`
- `prisma/**`, `package.json`, `tsconfig.json`

## Verify before reporting done

From `apps/api`:

```bash
pnpm node:typecheck
npx prettier --check "src/modules/**/*.docs.ts"
```

Both must pass. Run `npx prettier --write "src/modules/**/*.docs.ts"` to fix
formatting.

## Required completion report

Print this table filled in with the **actual** number of `export const`
statements in each file you wrote (`grep -c "^export const" <file>`), plus the
typecheck result. Do not claim a row is done without producing the file.

```
| # | Output file | Constants expected | Constants written |
```
