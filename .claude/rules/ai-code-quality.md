# AI Code Quality — reuse first, no parallel implementations

Read this before non-trivial implementation or refactoring work. This rule exists to prevent locally plausible code from increasing repository-wide maintenance cost.

## Core rule

**Search before writing.** Before creating a helper, type, schema, service, repository, error, route abstraction, SDK method, compatibility shim, or dependency, locate the repository's existing owner and equivalent behavior.

A locally clean implementation is not justification for a second implementation of the same platform or product capability.

## Required pre-write checks

Before creating or duplicating code, search for:

1. the domain/resource name and intended verb;
2. equivalent exported types and Zod schemas;
3. existing error codes/helpers;
4. existing bounded SDK/resource methods;
5. existing auth/access/context resolution;
6. existing utilities that already implement the transformation;
7. existing tests that define the contract.

If equivalent behavior exists in two apps, **do not create a third copy**. Move or expose the shared behavior at its canonical owner unless the difference is an intentional product policy.

## Ownership rules

- Domain contracts live with the owning bounded package. Consumers import them; they do not restate them.
- Business capabilities are implemented once by the owning service. Additional session/service/operator/integration callers route to that implementation with different authorization, not duplicated business logic.
- Next.js route handlers authorize and adapt transport only. Do not recreate service policy in a route.
- Shared transport/error primitives belong in their existing core package; do not hand-build a second result envelope.
- App-local differences should be data/configuration where possible, not copied implementations with one changed literal.

## Abstraction budget

Do not add an abstraction only because it looks reusable.

Create a new shared abstraction when at least one is true:

- two or more real call sites need the same behavior;
- the repository already establishes that abstraction shape for the concern;
- centralization is required to preserve a security, data, or wire-contract invariant.

Avoid one-implementation interfaces, pass-through services, wrapper-on-wrapper layers, factories with one concrete output, and aliases that only rename an existing type/function.

## Defensive-code rules

- Do not convert unexpected failures into valid empty states (`[]`, `{}`, `null`, `false`) unless the contract explicitly defines that fallback.
- Authorization may fail closed, but unexpected infrastructure/programming failures must remain observable according to `error-handling.md`.
- Do not add optional chaining, fallback property names, or runtime guards for states the static/runtime contract says are impossible. Fix the contract violation instead.
- Do not use `as any`, `eslint-disable`, `@ts-ignore`, or a config relaxation to make generated code fit. `as unknown as T` is a boundary escape only and must be justified by a real external/library mismatch.

## Migration and compatibility rules

Do not create deprecated aliases, dual property names, dual routes, dual reads/writes, or legacy fallbacks unless an explicit compatibility requirement exists.

When a migration is intended to be complete:

1. search for the obsolete name/path/type;
2. update all in-repo callers;
3. delete the obsolete implementation;
4. retain a shim only when an external compatibility contract requires it;
5. document the shim's removal condition.

Transitional code without a removal condition is technical debt, not safety.

## Comments and documentation

Comments explain **why**, invariants, constraints, provider quirks, or non-obvious failure modes. Do not narrate obvious syntax or restate names/types.

Good:

```ts
// Keep platform outages distinct from "no organization" so onboarding does
// not offer creation to an already-provisioned account.
```

Bad:

```ts
// Get the customer
const customer = await customers.retrieve(id)
```

## Tests

A generated test must prove behavior, not prove that mocks return their configured values.

- Assert complete stable result shapes where the repo rules require them.
- Prefer contract/invariant assertions over `toBeDefined()`/existence-only checks.
- Include negative space: validation, authorization, malformed data, and relevant boundary cases.
- Do not mock the unit under test's meaningful behavior away.

## Diff review gate

Before declaring implementation complete, review the diff specifically for:

- duplicate helpers/types/schemas/services;
- a new local implementation of an existing cross-app concept;
- unnecessary files/layers/dependencies;
- compatibility residue and dead code;
- swallowed errors or confident fallbacks;
- `as any`, `as unknown as`, `eslint-disable`, `@ts-ignore`;
- narrative comments/JSDoc;
- scope expansion unrelated to the requested change.

New line count is not progress. Prefer deleting, consolidating, or extending existing code over adding parallel code.
