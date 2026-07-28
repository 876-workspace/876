# Phase 1 — `@876/settings` shared package

## Goal

Create a new shared workspace package `@876/settings` that gives **every current and
future 876 SaaS app** (couriers first, then billing, enterprise, and future product
apps) one reusable way to declare:

1. **Modules** an organization can enable/disable (deliveries, items, customers, …).
2. **Preferences** each module exposes, with types, defaults, and validation.
3. The **settings navigation IA** (groups → items) in an RSC-serializable form.
4. A **setup-readiness model** — "you still need to set up X" — layered _below_
   provisioning (provisioning = mandatory, readiness = recommended/optional).

This package is **pure logic and types only**. It must not import React, Prisma,
Next.js, any app, or any other `@876/*` package except `zod`. Storage lives in each
consuming app's own datastore; this package defines the contract that storage fills.

## Scope — files you create

```
packages/settings/package.json
packages/settings/tsconfig.json
packages/settings/src/index.ts
packages/settings/src/types/module.ts
packages/settings/src/types/preference.ts
packages/settings/src/types/nav.ts
packages/settings/src/types/readiness.ts
packages/settings/src/catalog.ts
packages/settings/src/preferences/schema.ts
packages/settings/src/preferences/encode.ts
packages/settings/src/preferences/resolve.ts
packages/settings/src/nav/registry.ts
packages/settings/src/readiness/evaluate.ts
```

Plus a colocated `*.test.ts` beside every source file that contains logic
(`catalog.ts`, `preferences/*.ts`, `nav/registry.ts`, `readiness/evaluate.ts`).
Type-only files need no tests.

**Do not touch any file outside `packages/settings/`.** Do not modify
`pnpm-workspace.yaml` (the `packages/*` glob already picks this up). Do not commit.

## package.json — copy the shape of `packages/core/package.json`

```json
{
  "name": "@876/settings",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "exports": {
    ".": { "types": "./src/index.ts", "default": "./src/index.ts" },
    "./nav": {
      "types": "./src/nav/registry.ts",
      "default": "./src/nav/registry.ts"
    },
    "./readiness": {
      "types": "./src/readiness/evaluate.ts",
      "default": "./src/readiness/evaluate.ts"
    },
    "./types": {
      "types": "./src/types/index.ts",
      "default": "./src/types/index.ts"
    }
  },
  "scripts": {
    "test": "vitest run",
    "typecheck": "tsc --noEmit",
    "clean": "rm -rf .turbo"
  },
  "dependencies": { "zod": "4.4.3" },
  "devDependencies": {
    "@types/node": "25.6.2",
    "typescript": "5.9.3",
    "vitest": "4.1.5"
  }
}
```

Add `packages/settings/src/types/index.ts` re-exporting the four type modules.
`tsconfig.json`: copy `packages/core/tsconfig.json` verbatim.

## Types — exact shapes required

### `types/preference.ts`

The typed-value union deliberately mirrors the platform's existing provisioning
property model (`apps/api/domains/provisioning/schemas.py`) so the two layers
speak the same value vocabulary.

```ts
export type PreferenceValueType =
  | 'boolean'
  | 'string'
  | 'enum'
  | 'integer'
  | 'decimal'
  | 'reference'

/** A decimal is carried as a string end-to-end — never a JS number — so money
 *  and rate values never lose precision. */
export type PreferenceValue = boolean | string | number

export interface PreferenceOption {
  value: string
  label: string
}

interface PreferenceBase {
  /** snake_case, unique within its module. */
  key: string
  label: string
  /** One short line of helper text, or omitted. Never a paragraph. */
  hint?: string
  /** When true the preference is shown but not editable by an org admin. */
  readOnly?: boolean
}

export type PreferenceDefinition =
  | (PreferenceBase & { type: 'boolean'; default: boolean })
  | (PreferenceBase & { type: 'string'; default: string; maxLength?: number })
  | (PreferenceBase & {
      type: 'enum'
      default: string
      options: PreferenceOption[]
    })
  | (PreferenceBase & {
      type: 'integer'
      default: number
      min?: number
      max?: number
    })
  | (PreferenceBase & {
      type: 'decimal'
      default: string
      min?: string
      max?: string
    })
  | (PreferenceBase & { type: 'reference'; default: string; namespace: string })

/** The storage-facing row shape every consuming app persists. Column names are
 *  camelCase here; an app maps them to its own snake_case columns. */
export interface StoredPreferenceRow {
  module: string
  key: string
  valueType: PreferenceValueType
  stringValue: string | null
  integerValue: number | null
  decimalValue: string | null
  booleanValue: boolean | null
  referenceNamespace: string | null
  referenceKey: string | null
}

/** Fully-resolved preferences for one module: every declared key present. */
export type ResolvedModulePreferences = Record<string, PreferenceValue>
```

`enum` and `reference` both store into `stringValue` / `referenceKey` respectively —
`enum` uses `stringValue`, `reference` uses `referenceNamespace` + `referenceKey`.

### `types/module.ts`

```ts
export interface ModuleDefinition {
  /** snake_case module key. MUST match the app's permission-catalog module key
   *  where one exists, so `<module>.view` gates the module's settings page. */
  key: string
  label: string
  /** When false the org cannot turn this module off (it is structural). */
  optional: boolean
  /** Default enabled state for a newly provisioned organization. */
  enabledByDefault: boolean
  preferences: PreferenceDefinition[]
}

export type ModuleCatalog = readonly ModuleDefinition[]

/** Per-org enable/disable state, independent of preference values. */
export interface ModuleState {
  module: string
  isEnabled: boolean
}
```

### `types/nav.ts` — MUST be RSC-serializable

Critical constraint: this data crosses the React Server → Client boundary, so it
must contain **no icon components and no functions** — only plain data. Icons are
string keys the consuming app resolves to components itself (the same technique
`ResourceToolbar`'s `DropdownAction.icon` already uses in this repo).

```ts
export type SettingsItemStatus = 'available' | 'planned'

export interface SettingsNavItem {
  title: string
  /** Path relative to the app's settings root, e.g. '/settings/branches'.
   *  Required when status is 'available'; omitted when 'planned'. */
  href?: string
  status: SettingsItemStatus
  /** Permission key gating visibility, e.g. 'settings.view'. Omit for always-visible. */
  permission?: string
  /** Module key when this item edits a module's preferences. */
  module?: string
}

export interface SettingsNavGroup {
  key: string
  title: string
  /** String icon key resolved to a component by the consuming app. */
  icon: string
  items: SettingsNavItem[]
}

export type SettingsNav = readonly SettingsNavGroup[]
```

### `types/readiness.ts`

```ts
export type SetupSeverity = 'required' | 'recommended' | 'optional'

export interface SetupRequirement {
  key: string
  label: string
  severity: SetupSeverity
  /** Where the admin goes to satisfy it. */
  href: string
  module?: string
}

export interface SetupTask extends SetupRequirement {
  isSatisfied: boolean
}

export interface SetupReadiness {
  tasks: SetupTask[]
  outstandingRequired: number
  outstandingRecommended: number
  /** True when no `required` task is outstanding. */
  isReady: boolean
  /** True when nothing at all is outstanding, required or recommended. */
  isComplete: boolean
}
```

## Functions — exact behavior required

### `catalog.ts`

- `defineModuleCatalog(modules: ModuleDefinition[]): ModuleCatalog` — validates and
  freezes. **Throws** on: duplicate module keys, duplicate preference keys within a
  module, a preference key or module key that is not `^[a-z][a-z0-9_]*$`, an `enum`
  whose `default` is not among its `options`, an `integer`/`decimal` whose `default`
  falls outside `min`/`max`. Throwing is correct here — a malformed catalog is a
  programming error caught at module load, not a runtime input.
- `findModule(catalog, key): ModuleDefinition | undefined`
- `findPreference(catalog, module, key): PreferenceDefinition | undefined`
- `moduleDefaults(module: ModuleDefinition): ResolvedModulePreferences`

### `preferences/schema.ts`

- `preferenceSchema(def: PreferenceDefinition): ZodType` — one Zod schema per
  definition honouring `maxLength`, `min`, `max`, and `options`. `decimal` validates
  a string against `/^-?\d{1,16}(\.\d{1,8})?$/` and range-compares numerically
  **without** going through `parseFloat` for the stored value (compare via a
  decimal-string comparison helper; you may parse for the comparison only).
- `moduleUpdateSchema(module: ModuleDefinition): ZodType` — a **partial** object:
  every preference key optional, unknown keys **rejected** (`z.strictObject`),
  `readOnly` preferences rejected with a clear message.

### `preferences/encode.ts`

- `encodePreference(def, value): { data: StoredPreferenceRow; error: null } | { data: null; error: PreferenceError }`
  where `PreferenceError = { code: string; message: string; param?: string }` —
  match this repo's `{ data, error }` envelope convention (`.claude/rules/stripe-api-pattern.md`).
  Every unused typed column is `null`. `valueType` echoes `def.type`, except `enum`
  which stores `valueType: 'enum'` with the value in `stringValue`.
- `decodePreference(def, row: StoredPreferenceRow): PreferenceValue` — returns the
  stored value, **falling back to `def.default`** when the row's `valueType` does not
  match the definition or the expected typed column is `null`. Decoding never throws:
  a stale row left behind by a definition change must degrade to the default, not
  crash a settings page.

### `preferences/resolve.ts`

- `resolveModulePreferences(module: ModuleDefinition, rows: StoredPreferenceRow[]): ResolvedModulePreferences`
  — start from `moduleDefaults`, overlay each row whose `module` matches, ignore rows
  for unknown keys. Every declared key is always present in the result.
- `resolveCatalogPreferences(catalog: ModuleCatalog, rows: StoredPreferenceRow[]): Record<string, ResolvedModulePreferences>`
  — same, keyed by module.
- `diffPreferences(module, current, patch): StoredPreferenceRow[]` — encode only the
  keys whose value actually changes, so a save writes the minimum set of rows.

### `nav/registry.ts`

- `defineSettingsNav(groups: SettingsNavGroup[]): SettingsNav` — validates and
  freezes. **Throws** on duplicate group keys, duplicate item titles within a group,
  an item with `status: 'available'` and no `href`, or an item with
  `status: 'planned'` that has an `href`.
- `filterSettingsNav(nav: SettingsNav, permissions: readonly string[]): SettingsNav`
  — drops items whose `permission` is not held, then drops any group left with zero
  items. An item with no `permission` always survives.
- `resolveSettingsHref(orgSlug: string, item: SettingsNavItem): string | undefined`
  — returns `/org/${orgSlug}${item.href}` or `undefined` when `href` is absent.

### `readiness/evaluate.ts`

- `evaluateSetup(requirements: readonly SetupRequirement[], satisfied: readonly string[]): SetupReadiness`
  — pure and data-only, no callbacks, so the result is safely passed from a server
  component to a client component. Sort `tasks` by severity (`required`,
  `recommended`, `optional`) then by declaration order. Counts exclude satisfied
  tasks. `isReady` ignores `optional`; `isComplete` ignores `optional` too — only
  `required` and `recommended` count toward completion.

## Testing requirements

Follow `.claude/rules/testing.md`. In particular:

- Every branch of `encodePreference` / `decodePreference` per value type, including
  the degrade-to-default paths (wrong `valueType`, null column).
- `defineModuleCatalog` and `defineSettingsNav` throw cases — one test per throw
  condition listed above, asserting the message.
- `moduleUpdateSchema` rejects unknown keys and `readOnly` keys.
- `resolveModulePreferences` with: no rows, partial rows, rows for unknown keys,
  rows for another module.
- `filterSettingsNav` drops an emptied group entirely.
- `decimal` precision: assert a value like `'12345678.12345678'` round-trips through
  encode → decode **as the identical string**.
- Assert full result shapes, not `toBeDefined()`.

## Verification (must pass before you report done)

```
pnpm install --filter @876/settings
pnpm --filter @876/settings typecheck
pnpm --filter @876/settings test
```

## Rules to follow

- `.claude/rules/types.md` — shared contracts live in `src/types/`, PascalCase types,
  camelCase Zod schemas ending in `Schema`.
- `.claude/rules/code-style.md` — single-statement `if` without braces; blank lines
  between concern groups.
- `.claude/rules/stripe-api-pattern.md` — `{ data, error }` envelopes, client-safe
  errors carry no HTTP status.
- `.claude/rules/naming.md` — `Org` not `Organization`, `Config` not `Configuration`.
- Prettier: single quotes, no semicolons (root `.prettierrc`).

## Out of scope — do NOT do these

- No React, no `.tsx`, no UI components.
- No Prisma models or migrations.
- No changes in `apps/couriers` or any other app.
- No git commits, no branch changes.
