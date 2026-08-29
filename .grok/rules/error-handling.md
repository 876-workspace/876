# Error Handling, Values & UI

Read this before defining an error, returning a service result, handling an SDK/API failure, or rendering an error in any 876 app. This rule applies to every current and future product app.

## Single source of truth

The registered error catalogs are the **only source of truth** for public application error codes, messages, HTTP statuses, descriptions, and supported parameter metadata.

- Shared/platform and cross-package catalogs live under `packages/core/src/lib/errors/`.
- A product may own a focused catalog in its owning package when the contract is not shared, but it must still have exactly one canonical definition per code.
- Call sites must never restate a registered public message or status.
- Do not pass raw provider, database, framework, or caught exception messages through as public application messages.
- Provider/database details belong in structured logs/Sentry; the client receives the registered application error.

## Expected failures are values

Expected failures are part of an operation's contract and must be returned as values, not thrown. Validation, missing resources, conflicts, authorization failures, lifecycle states, provider rejections, and deliberately normalized dependency failures are values.

```ts
const customer = await repository.retrieve(id)
if (!customer) return getError('customer/not-found')
return customer
```

SDK and JSON API boundaries use the canonical `{ data, error }` envelope. Never turn a returned application error back into an exception:

```ts
// Forbidden for expected failures
if (result.error) throw new Error(result.error.message)
```

## What may throw

Throw only for genuinely unexpected failures: programming bugs, corrupt internal state, unrecoverable startup/configuration failures, or runtime/infrastructure faults that have not been deliberately normalized at the current boundary.

Even then, user-facing app routes should contain unexpected failures as locally as practical and report them to Sentry/logging. A framework/Vercel full-page error boundary is a last-resort safety net, not the normal UX.

## UI rule: errors do not own the page

An error should **not take over the page, remove the toolbar, destroy the table shell, or replace otherwise usable UI**. Keep the surrounding UI mounted and show the failure in context.

`AppError` is a compact notice, not an error screen.

| Failure scope | Required behaviour |
| --- | --- |
| List/table request fails | keep toolbar, filters, table/list shell and pagination region mounted; show a compact banner above the data region |
| Some enrichment fails | render truthful primary data and show a small inline notice for the missing enrichment |
| One card/section fails | keep sibling sections; show a notice only inside that section |
| Create/edit submission fails | keep the form and entered values; show a persistent form notice near the affected controls |
| Small mutation fails | keep the control in place and show a local inline/form notice; do **not** default to an error toast |
| Resource does not exist | use resource-aware not-found UI when that is truly the state |
| Unauthorized/forbidden | keep app chrome and show a scoped access state |
| Unexpected exception | capture/report it and preserve as much shell/content as safely possible; framework error page is last resort |

Do not confuse "no data" with "failed to load data". When a primary dataset fails, an empty table may remain mounted for structural continuity, but it must be paired with a visible failure notice.

## Console versus product apps

Console is an internal operator surface and may expose more safe diagnostic context directly in the UI: stable error code, safe descriptions/params, and request/Sentry correlation when available. Never expose secrets, raw SQL, credentials, stack traces, or sensitive payloads.

Product apps such as CRM should prefer user-friendly registered copy and normally hide the machine code from the main visual hierarchy. The code still travels through the result for logging, support, analytics, and Sentry correlation.

## Toasts

Success toasts are fine. Error toasts are **not the default application-error pattern** because they disappear, interrupt the user, and detach the failure from the control that caused it.

Use an error toast only for a genuinely transient action with no durable place in the UI. Otherwise store `result.error` in local state and render `AppError` next to the form/control/section.

## Future app checklist

- [ ] Every expected public error has one registered catalog definition.
- [ ] No route/service/component duplicates a registered message or HTTP status.
- [ ] Expected service failures are returned as values.
- [ ] SDK/API methods preserve `{ data, error }` without requiring `try/catch` for expected failures.
- [ ] Provider/database errors are normalized at their owning boundary and raw details stay internal.
- [ ] Page chrome and data-region structure remain mounted during recoverable failures.
- [ ] A failed primary dataset is visibly distinguished from a real empty dataset.
- [ ] Independent section failures do not destroy usable sibling sections.
- [ ] Forms preserve entered data when submission fails.
- [ ] Mutation errors are rendered beside their originating control/form rather than defaulting to toasts.
- [ ] Console can expose safe diagnostic codes/details; product apps keep public copy friendly.
- [ ] Tests verify expected failures do not trigger framework error boundaries.

## Migration state

`apps/crm-api` is the reference implementation of the value contract; Console and CRM are migrated on the UI side.

`apps/api`, `apps/billing-api`, and `apps/couriers-api` still throw registered errors to their central error middleware. Those call sites are a **pending migration, not defects to fix opportunistically** — a half-converted throwing boundary leaves callers that neither check a return value nor catch. Migrate a service as a whole, or leave it alone.

Adding a **new** throwing call site for an expected failure, or turning a returned application error back into an exception, is not allowed anywhere.

## Review grep

Treat these as review failures unless explicitly handling an unexpected exception, or they sit in a service listed above as unmigrated:

```txt
throw appError(...)
throw crmError(...)
throw getError(...)
```

Treat these as review failures anywhere:

```txt
if (result.error) throw new Error(result.error.message)
toast.error(result.error.message)
```
