# App API Routing — every app is a full-stack Next.js app

Read this before adding, moving, or renaming any route under `src/app/api/` in
any 876 Next.js app, and before deciding how a client component talks to a
backend. It fixes the browser-facing contract and its relationship to the
server-side bounded clients.

Companion to `.agents/rules/access-tiers.md` (on whose authority the server half
calls), `.agents/rules/product-api-boundary.md` (product vocabulary), and
`.agents/rules/api-access.md` (Console specifics).

## The invariant

**From the browser, every 876 app is an ordinary full-stack Next.js app that
talks to its own `/api` routes on its own origin.** Backend topology — which
service owns the data, at which tier, behind which credential — is server-side
implementation detail the browser never sees.

```
browser  ──►  /api/<resource>              same origin, product vocabulary
              route handler                authorize + adapt transport, no logic
              <domain>.<resource>.<verb>() server-only bounded client
              owning service               at the tier from access-tiers.md
```

### This does not duplicate or fight the bounded client

The two answer different questions and never overlap:

- The **route** is the browser contract. It exists so the client never learns a
  service origin, never holds a credential, and never has to change when the
  backend is re-homed.
- The **bounded client** is server-to-server transport. It exists so the server
  half never hand-rolls a `fetch` or restates a response shape. Each domain has
  its own typed root.

A route handler that calls `crm.requests.create()` is the same shape as a
traditional Next.js route handler calling a database client. The bounded SDK
_is_ the data client here. The
"external connection" is not a duplicate of anything — it is the one hop that
was always going to exist, now typed.

The rule stays intact only because the handler holds **no business logic**. The
moment a handler decides something the service should have decided, the app has
grown a second implementation and the typed client has become decoration.

## URL shape

Browser-visible URLs are the **product's** resource vocabulary:

```
/api/customers            /api/invoices          /api/requests
/api/requests/:id/tasks   /api/billing-accounts  /api/organizations/:id/members
```

Never a service namespace or a backend version, even when one service serves the
whole resource:

```
/api/v1/*        /api/billing/*      /api/crm/*
/api/storage/*   /api/integrations/*
```

Console names routes after **what the operator is acting on**, not which service
receives the call — `/api/organizations/:id/requests`, not `/api/crm/requests`.

Reserved, and the only exceptions: `/api/auth/*` (protocol bridge),
`/api/health`, `/api/ready`, and provider callback paths a vendor pins.

## Two sanctioned handler patterns

### Pattern A — typed resource route (the default)

An explicit route file per resource or operation. It authorizes, calls one
owning-domain verb, and returns the envelope.

```ts
export async function POST(request: NextRequest, context: Context) {
  const { response } = await requireConsolePermission('console:organizations')
  if (response) return response

  const { id: organizationId } = await context.params
  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object')
    return apiJson({ error: 'Invalid request body.' }, { status: 400 })

  const crm = createCrm(resolveRequestId(request))
  const { data, error } = await crm.requests.create(organizationId, body)
  if (error || !data)
    return apiJson({ error: error?.message ?? 'Failed.' }, { status: 400 })

  return apiJson({ data }, { status: 201 })
}
```

Use Pattern A — always — when any of these is true:

- the response composes data from more than one service;
- the app applies its own permission or business decision;
- the operation is cross-org, operator-tier, or otherwise not a plain
  pass-through of one org-scoped resource.

### Pattern B — registered resource proxy

A `[[...path]]` handler that forwards bytes to the owning service's
**integration** boundary under a fixed top-level resource.

```
src/app/api/customers/[[...path]]/route.ts  →  createInvoiceResourceRoute('customers')
```

Permitted only when **all** of these hold:

1. the resource is wholly owned by one service, which enforces its own
   authorization;
2. the top-level resource name is a **literal in server code** — never taken
   from the request path;
3. the app adds no logic beyond session check, org resolution, and credential
   attachment;
4. the resource is listed in the app's proxy manifest
   (`src/lib/api/resource-manifest.ts`), so the exposed surface is enumerable
   and testable rather than implied by the file tree.

A proxy whose top-level segment comes from the URL is a **generic gateway**, and
is forbidden: it lets the browser choose which backend path to reach, which is
an authorization decision the app has silently delegated to whoever crafted the
URL.

**When in doubt, Pattern A.** Pattern B is an optimization for a large,
faithfully-mirrored resource family (Billing's ~30 resources), not the default.

## Client side

Browser components call the app's typed client (`client` from `@/lib/client`),
never `fetch` with a hand-written URL, and never a service origin. The typed
client covers **mutations and client-driven reads only** — it is not a second
mirror of the server SDKs. Initial page data is server-rendered through the
appropriate bounded client behind a Suspense boundary
(`.agents/rules/data-loading.md`).

**No server actions.** Client-initiated mutations go through a route handler.

## Do not

- Do not expose a service namespace, a backend version, or an integration path
  in a browser URL.
- Do not add a rewrite that aliases an app path to another service's origin.
- Do not add a catch-all whose first segment comes from the request.
- Do not put business logic, database access, or provider SDK calls in a route
  handler.
- Do not add a Pattern B proxy without a manifest entry.
- Do not use a server action for a backend mutation.
- Do not refetch server-rendered initial data from the browser to work around a
  badly placed Suspense boundary.
- Do not add a cross-domain server-client aggregator for route handlers.
