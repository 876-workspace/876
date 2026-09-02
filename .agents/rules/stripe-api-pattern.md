# Stripe-Inspired API Pattern Rules

Read this before creating/changing API resources, service/SDK results, provider
mappers, DTOs, route JSON, Zod schemas, or database-backed app objects.

This platform borrows Stripe's **resource ergonomics**, not Stripe's exact
spelling. `.agents/rules/naming.md` is authoritative: new 876-owned JSON fields
are camelCase and new multiword 876-owned symbolic values/discriminators are
kebab-case. Existing public v1 snake_case contracts stay compatible until an
explicit migration is implemented.

## Core direction

Preserve the repository's established service/SDK/auth/provider boundaries.
Apply the Stripe-inspired pattern to predictable resource names, literal object
discriminators, pagination containers, method vocabulary, JSDoc, and SDK
usability. Do not restructure an application merely to resemble Stripe.

## Result envelopes

When the endpoint family uses a result envelope, keep the stable union:

```ts
type ApiResult<TSuccess, TError> =
  { data: TSuccess; error: null } | { data: null; error: TError }
```

Do not add a synthetic `result` discriminator. Service internals may retain the
established result style of their bounded context unless that family is being
intentionally migrated.

Expected domain/provider/auth failures follow `error-handling.md`. Unexpected
bugs may throw into the app/service error boundary.

## Error shapes

Client-safe errors do not expose transport-only status or raw provider details:

```ts
interface AppError<Code extends string = string> {
  code: Code
  message: string
  description?: string
  param?: string
}

interface FullError<Code extends string = string> extends AppError<Code> {
  httpStatus: number
}
```

- Route/controller code uses `httpStatus`; client JSON does not receive it unless
  an existing public contract explicitly says otherwise.
- Error codes are durable 876-owned symbolic values. New codes use namespaced
  kebab-case, e.g. `billing/workspace-not-found`.
- Existing public codes are renamed only through an explicit compatibility
  migration.
- Provider errors are normalized centrally before crossing the app boundary.
- Never leak provider responses, SQL errors, tokens, PII, secrets, or stack
  traces.

## Resource objects

Every discrete app-owned serialized resource should carry a literal `object`
discriminator when the endpoint family uses object resources:

```ts
interface Customer {
  object: 'customer'
  id: string
}
```

Rules:

- Service namespaces are plural; resource discriminators are singular.
- New one-word values stay one word (`customer`, `user`, `session`).
- New multiword 876-owned discriminator values use kebab-case:
  `payment-intent`, `search-result`, `application-module`.
- Do not use dotted/namespaced object discriminator values unless a specific
  existing contract requires them.
- Use literal types rather than broad `string` when known.
- Deleted resources may use tombstones such as
  `{ object: 'user', id, deleted: true }`.

Existing v1 discriminators such as `payment_intent`, `search_result`,
`application_module`, or `my_work` are **legacy public contracts**. Do not change
them in place. Migrate Zod/OpenAPI, SDKs, callers, fixtures, and external clients
together using the compatibility strategy in `express-api.md`.

## Collection objects

For a **new canonical** list contract:

```ts
interface ApiList<T> {
  object: 'list'
  data: T[]
  hasMore: boolean
  totalCount?: number
  url: string
}
```

For a new search contract:

```ts
interface ApiSearchResult<T> {
  object: 'search-result'
  data: T[]
  hasMore: boolean
  nextPage: string | null
  totalCount?: number
  url: string
}
```

`nextPage` is opaque. Existing v1 `has_more`, `total_count`, `next_page`, and
`object: 'search_result'` shapes remain legacy compatibility surfaces until the
endpoint family is explicitly migrated.

## Type naming

Shared TypeScript contracts use flat PascalCase names:

- `Customer`, `DeletedCustomer`
- `CustomerCreateParams`, `CustomerUpdateParams`, `CustomerListParams`
- `RequestOptions`
- `ApiResult<TSuccess, TError>`
- `ApiList<TItem>`, `ApiSearchResult<TItem>`

Do not copy Stripe's deep namespaced type style. Use `interface` for exported
object shapes and `type` for unions/mapped/utility aliases when that matches the
repo's type rules.

## Zod

Schemas are camelCase ending in `Schema`, paired with the shared contract.
Prefer strict app-owned request schemas; use loose/provider schemas only when
passthrough/backward compatibility is intentional and documented.

```ts
export const userSchema = z.strictObject({
  object: z.literal('user'),
  id: z.string(),
})
```

Reusable list/search schema helpers should follow the canonical field spelling
for new contracts. Existing legacy endpoint schemas preserve their current wire
shape until migrated.

## SDK/service verbs

Prefer predictable resource verbs:

```text
create
retrieve
update
del
list
search
cancel
```

Use `del` for deletion resources/tombstones and `cancel` for lifecycle
operations. Do not expose options such as idempotency/retry/provider account
selection unless the SDK actually implements them.

## JSDoc

Keep exported resource/SDK documentation repetitive and editor-friendly: short
field descriptions, method summary, params, return shape, and a useful example
or `@see` when appropriate. Do not document obvious assignment details.

## Route handlers/controllers

Do not define shared exported response contracts inline in route files. Reuse
the owning type/Zod contract. Where `ApiResult` is established:

```ts
return Response.json({ data: resource, error: null })
```

and errors use the server status while returning the client-safe error shape.
Do not mix canonical and legacy fields within one response unless a documented
migration explicitly requires dual-shape output and tests cover it.

## Provider boundaries

Provider naming belongs inside the provider adapter. Preserve raw provider
spelling when parsing/serializing that provider's protocol; normalize to the
876 contract before the object crosses into app/service/SDK layers. Provider IDs
should be explicit (`workosUserId`, `stripeCustomerId`, `posthogDistinctId`).

## Database boundary

Persisted database rows and public API DTOs are different contracts. The
physical SQL schema may keep existing snake_case names via Prisma `@map` /
`@@map`; new app/client fields remain camelCase. Stored 876-owned symbolic
**values** follow the naming migration rules even when their containing SQL
column remains snake_case.

## Testing checklist

Cover the relevant contract boundary:

- success/error envelopes;
- client-safe vs server-only error fields;
- literal object discriminator;
- list/search/tombstone shape;
- SDK malformed-response rejection;
- provider mapper behavior;
- auth behavior;
- canonical naming for new contracts;
- legacy compatibility and removal-point tests when migrating an established
  contract.

## Do not

- Do not treat Stripe's snake_case spelling as the 876 naming standard.
- Do not create new snake_case 876 JSON properties/discriminators.
- Do not rename existing public wire fields/discriminators without a coordinated
  compatibility plan.
- Do not leak provider DTOs directly into 876 public contracts.
- Do not mass-replace underscores in databases or provider payloads.
