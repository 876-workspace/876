# Stripe-Inspired API Pattern Rules

Read this file before creating, changing, reviewing, or consuming application API contracts, service results, SDK contracts, provider error mappers, domain DTOs, route handler JSON responses, Zod schemas, or database-backed application object models.

## Required Research Workflow

- Follow the patterns defined in this file. Consult external provider documentation only when a specific SDK or API behavior is unclear.
- For Next.js Route Handlers, Server Functions, authentication flows, redirects, metadata, instrumentation, or build behavior, read the matching Next.js 16 guide in `node_modules/next/dist/docs/` before editing.

## Core Direction

This application uses Stripe-inspired resource contracts while preserving the current service and SDK organization.

Keep this structure:

```txt
src/types/
src/lib/service/<resource>/<method>.ts
src/lib/service/<resource>/index.ts
src/lib/sdk/<resource>/<method>.ts
src/lib/sdk/<resource>/index.ts
src/app/api/<resource>/
```

Do not replace the app's service layer, SDK layer, auth flows, redirects, session checks, or provider mapping boundaries only to imitate Stripe. Apply the Stripe style to naming, self-describing payloads, pagination containers, JSDoc, and SDK ergonomics.

## Result Shapes

Use a predictable `{ data, error }` result envelope at SDK and JSON API boundaries when introducing or migrating app-owned API endpoints:

```ts
type ApiResult<TSuccess, TError> =
  | { data: TSuccess; error: null }
  | { data: null; error: TError }
```

Do not add a synthetic result object discriminator. Stripe returns resources, lists, search results, deleted tombstones, and errors with their own shapes; it does not use a synthetic result resource.

Service methods may continue to use the existing service result style, such as `TSuccess | FullError<Code>` or resource-specific `ServiceResult<TSuccess>`, when that is the surrounding module's established pattern. Do not churn a complete service family only to change result wrapping unless the endpoint contract is being intentionally migrated.

Expected validation, authentication, authorization, and provider failures should be returned as values. Unexpected bugs may still throw and should be handled by Next.js error boundaries, logging, or provider instrumentation.

## Error Shapes

Keep the current server/client error split. HTTP status stays server-only.

```ts
interface AppError<Code extends string = string> {
  code: Code
  message: string
  description?: string
  param?: string
}

interface FullError<Code extends string = string> extends AppError<Code> {
  httpStatus: HttpStatusCode
}
```

Rules:

- Route handlers use `FullError.httpStatus` for the response status.
- Client JSON and SDK errors use `AppError` and must not include `httpStatus`.
- Preserve existing custom error codes, messages, descriptions, params, and HTTP statuses.
- Do not leak raw provider exceptions, tokens, raw responses, PII, secrets, or unsafe metadata to clients.
- Provider errors must be normalized centrally before crossing app boundaries.

## Resource Objects

Every serialized success payload that represents a discrete app-owned resource should include a literal `object` discriminator.

```ts
interface Customer {
  /** String representing the object's type. Always `customer`. */
  object: 'customer'
  /** Unique identifier for the object. */
  id: string
}
```

Rules:

- Service namespaces are plural while payload discriminators are singular: `customers.create()` returns `object: 'customer'`.
- Use stable one-word or snake_case object values, such as `customer`, `user`, `session`, `payment_intent`, or `search_result`.
- Do not use dotted object names or namespaced discriminator values.
- Use literal object types, not broad `string`, whenever the payload shape is known.
- Deleted resource payloads should be tombstones: `{ object: 'user', id, deleted: true }`.

## Collection Objects

Lists use a dedicated Stripe-like container:

```ts
interface ApiList<T> {
  object: 'list'
  data: T[]
  has_more: boolean
  total_count?: number
  url: string
}
```

Search results use Stripe's search container spelling:

```ts
interface ApiSearchResult<T> {
  object: 'search_result'
  data: T[]
  has_more: boolean
  next_page: string | null
  total_count?: number
  url: string
}
```

Use `object: 'list'` for ordinary pagination and `object: 'search_result'` when the endpoint uses a query language or search cursor. `next_page` is opaque; callers must pass it back without parsing it.

## Type Naming Rules

Shared contracts belong in `src/types/` and use flat PascalCase names.

Preferred names:

- `User` or `Customer` for serialized resource payloads.
- `DeletedUser` or `DeletedCustomer` for deletion tombstones.
- `UserCreateParams` for `.create()` inputs.
- `UserRetrieveParams` only when retrieve needs more than an ID.
- `UserUpdateParams` for `.update()` inputs.
- `UserListParams` for `.list()` filters and pagination.
- `UserSearchParams` for `.search()` inputs.
- `UserCancelParams` for `.cancel()` inputs.
- `RequestOptions` for app-owned per-request SDK options.
- `ApiResult<TSuccess, TError>` for result envelopes.
- `ApiList<TItem>` for list containers.
- `ApiSearchResult<TItem>` for search containers.

Do not copy Stripe's namespaced type style. Avoid public app types such as `SDK.Customer`, `App.CustomerCreateParams`, `Stripe.InvoiceRenderingOptions`, or `Billing.Invoice.RenderingOptions`. Use one flat name like `InvoiceRenderingOptions`.

Use `interface` for exported object-shaped contracts and `type` for unions, mapped types, utility aliases, and discriminated unions.

## Zod Rules

Use strict Zod schemas for app-owned contracts and keep schemas next to their matching types in `src/types/`.

```ts
export interface User {
  /** String representing the object's type. Always `user`. */
  object: 'user'
  /** Unique identifier for the user. */
  id: string
}

export const userSchema = z.strictObject({
  object: z.literal('user'),
  id: z.uuid(),
}) satisfies z.ZodType<User>
```

Rules:

- Name schemas in camelCase ending with `Schema`.
- Prefer `z.strictObject` for app-owned API, service, SDK, and DTO schemas.
- Use `z.object` only when intentionally accepting provider-owned shapes, backwards-compatible loose input, or explicitly documented passthrough behavior.
- Reusable API container schemas should be generic helpers, such as `apiListSchema(itemSchema)` and `apiSearchResultSchema(itemSchema)`.
- Runtime validation should reject malformed result envelopes, malformed list/search containers, and malformed app-owned errors at SDK boundaries.

## SDK And Service Method Rules

Keep method names repetitive and predictable:

```txt
create
retrieve
update
del
list
search
cancel
```

Use `del`, not `delete`, because `delete` is a JavaScript keyword and Stripe uses `del` in the Node SDK.

Use `cancel` for lifecycle resources such as subscriptions, sessions, payment intents, jobs, or workflows. Use `del` for deletion tombstones.

App-owned SDK request options should be small and truthful. Start with only supported fields:

```ts
interface RequestOptions {
  /** Optional signal used to abort the request. */
  signal?: AbortSignal
}
```

Do not document Stripe options such as `stripeAccount`, `apiVersion`, `idempotencyKey`, `timeout`, or `maxNetworkRetries` unless the app SDK actually implements them.

## JSDoc Rules

Follow Stripe's repetitive, editor-friendly JSDoc style for exported contracts, schemas, service methods, and SDK methods.

Properties should explain the field briefly:

```ts
interface Customer {
  /** String representing the object's type. Always `customer`. */
  object: 'customer'
  /** Unique identifier for the object. */
  id: string
}
```

Methods should include summary, params, return shape, examples when useful, and `@see` when there is a stable route or external reference:

```ts
/**
 * Creates a new customer object.
 *
 * @param params - The parameters to create a customer with.
 * @param options - Optional per-request configuration.
 * @returns A Promise that resolves to a result containing a `Customer` object.
 *
 * @see /api/customers
 *
 * @example
 * const result = await sdk.customers.create({ email: 'alejandra@example.com' })
 * if (result.error) return result
 * console.log(result.data.object) // 'customer'
 */
create(
  params: CustomerCreateParams,
  options?: RequestOptions
): Promise<ApiResult<Customer, AppError>>
```

Keep comments succinct. Do not document obvious assignments or implementation details.

## Route Handler Rules

Route Handlers should not define exported shared response types inline. Put reusable contracts and Zod schemas in `src/types/`.

When a route returns an `ApiResult`, success responses should use:

```ts
return Response.json({ data: user, error: null }, { status: 200 })
```

Error responses should strip server-only fields from the body:

```ts
return Response.json(
  { data: null, error: toAppError(error) },
  { status: error.httpStatus }
)
```

Existing auth routes may keep their current response shape during migration. Do not mix shapes within a single endpoint family unless a backwards-compatible migration requires it and tests cover both shapes.

## Provider Error Mapping

Provider-specific errors must be normalized centrally.

- WorkOS errors use the central WorkOS mapper and API-boundary response helpers.
- Stripe, PostHog, and Sentry provider mappers should stay centralized when implemented.
- Do not create route-local provider error maps unless a rule explicitly permits it.
- Do not add concrete provider error codes before the corresponding error code registry is designed.

## Database And Future Sync Rules

When local database tables are introduced to sync WorkOS, Stripe, PostHog, Sentry, or other provider objects:

- Do not create tables until the data model is explicitly requested.
- Separate persisted DB rows from serialized API DTOs when their shapes differ.
- Serialized DTOs returned to app clients must include `object` discriminators.
- Provider IDs should be clearly named, such as `workosUserId`, `stripeCustomerId`, or `posthogDistinctId`.
- App-owned domain object names should be stable and singular: `user`, `organization`, `customer`, `subscription`.
- Use Stripe-style flat request types for local service and SDK methods from the start.

## Testing Checklist

When this pattern is changed or extended, cover:

- Success result envelopes include `error: null` and non-null `data` where the endpoint uses `ApiResult`.
- Error result envelopes include `data: null` and `error.code` is a stable error string where the endpoint uses `ApiResult`.
- Client-safe errors do not include `httpStatus`; route responses use `FullError.httpStatus` as the HTTP status.
- Custom `code`, `message`, `description`, and `param` fields are preserved.
- Auth failures preserve existing auth behavior.
- Provider errors are mapped through central provider mappers.
- SDK/client parsing rejects malformed response envelopes, malformed errors, and malformed list/search containers.
- List/search/delete resources use `object: 'list'`, `object: 'search_result'`, or Stripe-like deleted tombstones.
