# Brief — phone number formatting helper in `@876/core`

## Goal

Add a shared phone-number formatting/parsing helper to `@876/core` so every 876
app renders a stored phone number the same way. Stored values are raw digit
strings (e.g. `18765555555`, `+18765555555`, `8765555555`) and must render as:

- NANP (US/Canada + Caribbean NANP territories): `+1 (876) 555-5555`
- Non-NANP countries (Cuba `+53`, Haiti `+509`, Guadeloupe `+590`, etc.):
  `+53 5 1234567` style — group sensibly per country using the dial code, do
  not invent a fake NANP grouping.

Focus is the Caribbean, since that is the platform's market, but the helper
must degrade gracefully for any input (unknown country → `+<dial code> <rest>`,
unparseable → return the original string unchanged, never throw).

## Where it goes

- New file `packages/core/src/lib/phone.ts`.
- New subpath export `"./phone"` in `packages/core/package.json`, following the
  exact shape of the existing `"./timestamps"` entry.
- Country data already exists: `packages/core/src/countries.json`, entries of
  the shape `{ name, countryCode, areaCode, flag }` where `areaCode` is e.g.
  `"+1-876"` (Jamaica) or `"+53"` (Cuba). **Use this file as the source of
  truth for dial codes / NANP area codes — do not hardcode a second list.**
  Note `packages/core/src/lib/countries.ts` may already load it; check first
  and reuse whatever loader exists rather than re-importing the JSON a second
  way.

## API to implement

Export at minimum:

```ts
/** Normalizes any input to E.164 digits, e.g. "+18765555555". Null if unparseable. */
export function normalizePhone(input: string, defaultCountryCode?: string): string | null

/** Human display form, e.g. "+1 (876) 555-5555". Returns input unchanged if unparseable. */
export function formatPhone(input: string, defaultCountryCode?: string): string

/** Parsed parts, for callers that need them (dial code, national number, country). */
export function parsePhone(input: string, defaultCountryCode?: string): {
  e164: string
  dialCode: string        // "+1"
  areaCode: string | null // "876" for NANP, null otherwise
  nationalNumber: string
  countryCode: string | null // ISO-2, resolved from countries.json when unambiguous
} | null
```

`defaultCountryCode` is an ISO-2 code used to interpret a bare national number
(`"8765555555"` with `defaultCountryCode: 'JM'`). Keep the signatures small;
do not add options objects, formatting modes, or a class.

**No new dependencies.** Do not add `libphonenumber-js` or similar — this is a
small pure-TS helper over `countries.json`.

## Constraints

- Pure, synchronous, no I/O, no React, works in browser and on Workers.
- Follow `.claude/rules/code-style.md` (single-statement `if` without braces,
  blank lines between concern groups) and `.claude/rules/types.md` (exported
  types belong with the module; do not scatter them).
- Follow `.claude/rules/naming.md` — short clear names, no over-abbreviation.
- Do NOT change any call site or app code in this task. Helper + export +
  tests only.

## Tests (required)

Add `packages/core/src/lib/phone.test.ts` following
`.claude/rules/testing.md` — in particular: assert exact strings, not
`toBeDefined()`; one behavior per `it()`; cover
- `18765555555`, `+18765555555`, `8765555555` (with and without `defaultCountryCode`)
- formatted input already containing spaces/parens/dashes
- at least three non-Jamaica Caribbean NANP countries from `countries.json`
  (e.g. BB `+1-246`, TT `+1-868`, BS `+1-242`)
- at least two non-NANP Caribbean countries (CU `+53`, HT `+509`)
- unparseable inputs: `''`, `'abc'`, `'12'`, a 40-digit string → documented
  fallback behavior, never a throw
- `null`/`undefined` passed through `as unknown as string`

## Verify before reporting done

```
pnpm --filter @876/core typecheck
pnpm --filter @876/core test
pnpm --filter @876/core lint
```

All three must pass. Do not commit — the orchestrating agent stages and
commits.
