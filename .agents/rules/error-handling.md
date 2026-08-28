# Error Handling, Values & UI

Read this before defining an error, returning a service result, handling an SDK/API failure, or rendering an error in any 876 app. This rule applies to every current and future product app.

## Single source of truth

The registered error catalogs are the **only source of truth** for public application error codes, messages, HTTP statuses, descriptions, and supported parameter metadata.

- Shared/platform and cross-package catalogs live under `packages/core/src/lib/errors/`.
- A product may own a focused catalog in its owning package when the contract is not shared, but it must still have exactly one canonical definition per code.
- Call sites must never restate a registered public message or status.
- Do not pass raw provider, database, framework, or caught exception messages through as public application messages.
- Provider/database details belong in structured logs/Sentry; the client receives the registered application error.

```ts
// Good
return getError('crm/request-not-found')

// Bad: second source of truth
return {
  code: 'crm/request-not-found',
  message: 'Could not find request',
  httpStatus: 404,
}

// Bad: provider owns public copy
return getError('crm/registry-unavailable', {
  message: providerError.message,
})
```

## Expected failures are values

Expected failures are part of an operation's contract and must be returned as values, not thrown. This includes:

- validation and invalid input;
- authentication and authorization failures;
- missing resources;
- conflicts and business invariants;
- inactive/invalid lifecycle states;
- normalized provider rejections;
- expected dependency/network/service-unavailable outcomes.

Service methods use the surrounding established value style (`T | FullError<Code>`, `ServiceResult<T>`, or another typed result). SDK and JSON API boundaries use the canonical `{ data, error }` envelope.

```ts
const customer = await repository.retrieve(id)
if (!customer) return getError('customer/not-found')
return customer
```

A caller narrows the value explicitly:

```ts
const result = await service.retrieve(id)
if (isError(result)) return result
return result
```

## What may throw

Throw only for genuinely unexpected failures that are not part of the operation contract:

- programming bugs and impossible invariants;
- corrupt internal state;
- unrecoverable startup/configuration failures;
- unexpected library/runtime failures;
- unexpected infrastructure failures that have not been deliberately normalized at the current boundary.

Global framework error boundaries and Express error middleware are safety nets for these unexpected exceptions. They are not normal domain-control-flow mechanisms.

## HTTP and SDK boundaries

HTTP status is server-only. Client errors contain the public contract, never server implementation metadata.

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

At an HTTP boundary:

```ts
if (isError(result))
  return Response.json(
    { data: null, error: toAppError(result) },
    { status: result.httpStatus }
  )
```

Do not turn an SDK/application error back into an exception:

```ts
// Forbidden for expected failures
if (result.error) throw new Error(result.error.message)
```

## UI rule: preserve the error value

The UI must preserve both the human-readable registered message and the stable code. The message is visually primary; the code is secondary and copyable/searchable for support and debugging.

Use shared `@876/ui` error presentation primitives. Do not invent per-app error cards or strip errors down to strings.

Choose the smallest meaningful scope:

| Failure scope | Presentation |
| --- | --- |
| Primary page/list cannot load | `AppError` with `variant="page"` inside the live region |
| One independent card/section fails | `AppError` with `variant="section"` |
| Create/edit submission fails | persistent `AppError` with `variant="form"`; map `param` to a field when supported |
| Small independent mutation fails | `showAppErrorToast(error, { title })` |
| Optional enrichment fails | keep truthful primary content and show an inline/section warning |
| Resource genuinely does not exist | resource-aware `notFound()` / not-found UI when appropriate |
| Unauthorized/forbidden | dedicated access state where appropriate, still showing the registered code |
| Unexpected exception | framework/global error boundary using a registered internal error |

Never silently turn a failed primary dataset into `[]`, `{}`, `null`, or "No results". Optional enrichment may degrade only when the remaining UI is truthful, and the failure must remain visible when it affects what the user can understand or operate.

## Toasts

Do not use message-only application error toasts:

```ts
// Bad: loses the code
if (result.error) toast.error(result.error.message)

// Good
if (result.error)
  showAppErrorToast(result.error, { title: 'Status could not be updated' })
```

## Provider and database mapping

Catch only known provider/database outcomes that the domain deliberately maps. Do not wrap every exception in a generic value.

Examples:

- known unique constraint -> registered conflict value;
- provider says access denied -> registered authorization/provider value;
- provider is unavailable at an integration boundary -> registered dependency value plus internal logging;
- database driver unexpectedly crashes -> throw and let the unexpected-error boundary capture it.

## Future app checklist

Before a new app or resource family is considered complete:

- [ ] Every expected public error has one registered catalog definition.
- [ ] No route/service/component duplicates a registered message or HTTP status.
- [ ] Expected service failures are returned as values.
- [ ] SDK/API methods preserve `{ data, error }` without requiring `try/catch` for expected failures.
- [ ] Provider/database errors are normalized at their owning boundary and raw details stay internal.
- [ ] Primary load failures render a designed error state rather than a framework crash.
- [ ] Independent section failures do not unnecessarily destroy usable sibling sections.
- [ ] Form failures remain visible in the form and use `param` for field placement when available.
- [ ] Mutation toasts preserve both message and code.
- [ ] Not-found and access-denied states have appropriate UX.
- [ ] Tests assert stable code/message behavior and verify `httpStatus` does not leak into client JSON.
- [ ] Tests distinguish expected value failures from genuinely thrown exceptions.

## Review grep

Treat these shapes as migration/review failures unless the code is explicitly handling an unexpected exception:

```txt
throw appError(...)
throw crmError(...)
throw getError(...)
if (result.error) throw new Error(result.error.message)
toast.error(result.error.message)
```

When reviewing old code, do not mechanically replace every `throw`. Classify the failure first; preserve throws for true exceptions and convert expected application outcomes to values.
