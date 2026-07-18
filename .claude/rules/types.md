# Type Placement Rules

Read this file before generating or editing TypeScript code that introduces, changes, exports, or consumes shared types, interfaces, enums, or Zod schemas.

## Central Rule

Shared application contracts belong in `src/types/`.

This includes domain types, service inputs and outputs, API request and response shapes, error contracts, WorkOS wrappers, Zod schemas, and exported enums or string unions.

## Required Patterns

- Put reusable types in a focused file under `src/types/`, such as `src/types/auth.ts`, `src/types/errors.ts`, or `src/types/workos.ts`.
- Put reusable Zod schemas next to the types they infer in `src/types/`.
- Import shared types with `@/types/...` aliases instead of importing from service, SDK, app route, or component implementation files.
- Keep `src/lib/service/**`, `src/lib/sdk/**`, and `src/app/api/**` focused on behavior. These files should consume types from `src/types/`, not define exported contracts inline.
- Name types and interfaces in `PascalCase`.
- Name Zod schemas in `camelCase` ending with `Schema`.
- Prefer `z.infer<typeof someSchema>` for types that must match runtime validation.

## Allowed Exceptions

- Component-local prop types may stay next to the component when they are private to that component.
- Generated or shadcn/ui-style component types may stay in `src/components/ui/**` when they only describe that UI component.
- Page-local display state types may stay in a page file only when they are not exported and have no clear reuse across auth, services, SDK, or API code.
- Narrow implementation helper types may stay local when they are unexported, not reused, and only make a single function easier to type.

## When To Move A Type

Move a type or schema to `src/types/` when any of these are true:

- It is imported by more than one file.
- It crosses a service, SDK, route handler, or component boundary.
- It describes persisted data, API data, auth data, WorkOS data, or errors.
- It is exported from a module.
- It needs runtime validation with Zod.

## Anti-Patterns

- Do not define exported service or SDK parameter types inside `src/lib/service/**` or `src/lib/sdk/**`.
- Do not define API response types inside route handlers.
- Do not duplicate the same object shape in multiple files.
- Do not create barrel files that hide where large type modules come from unless there is a measured need.
