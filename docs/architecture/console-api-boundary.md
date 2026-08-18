# Console-owned API boundary

## Decision

876 Console is an administrative application over several first-party services. That breadth is intentional, but service topology is not part of Console's browser contract.

Console therefore has two distinct boundaries:

```text
browser -> Console-owned /api/<resource> -> Console server facade -> owning service
RSC/page -> Console server facade -> owning service
```

The canonical server facade is `createConsole876Client()` / `$876` in `apps/console/src/lib/876`. It is allowed to compose platform admin, Billing, Couriers, Storage, and Widgets clients. Feature code should not recreate those service clients.

## Browser vocabulary

Console URLs describe what the administrator is acting on rather than which backend receives the call.

| Retired service-shaped URL | Console-owned URL |
| --- | --- |
| `/api/billing/accounts` | `/api/billing-accounts` |
| `/api/billing/subscriptions` | `/api/billing-subscriptions` |
| `/api/billing/integrations/organizations/:id/customers` | `/api/organizations/:id/customers` |
| `/api/billing/mirror/reconcile` | `/api/finance/reconcile` |
| `/api/storage/apps/:id/image` | `/api/apps/:id/image` |
| `/api/storage/organizations/:id/image` | `/api/organizations/:id/image` |
| `/api/storage/users/:id/image` | `/api/users/:id/image` |
| `/api/widgets/features/:id` | `/api/widget-features/:id` |
| `/api/widgets/notepad` | `/api/notes` |
| `/api/widgets/notepad/collections` | `/api/note-collections` |
| `/api/widgets/admin/notepad` | `/api/notes/admin` |

Nested actions such as image `complete`/`remove` and subscription items remain beneath these owned resources.

The old `billing`, `storage`, and `widgets` route trees are not compatibility aliases. They are retired from `apps/console/src/app/api`.

## Server ownership

Route ownership does not move domain ownership. Examples:

- `/api/users/:id/image` still uses Storage for upload/file lifecycle and the platform API to attach the avatar.
- `/api/organizations/:id/customers` still uses Billing's formal organization integration capability.
- `/api/widget-features/:id` still verifies the target is a widget-tagged feature and uses Widgets/feature administration internally.
- `/api/finance/reconcile` still runs the Core-to-Billing mirror operation.

The route handler owns authentication, Console permission checks, transport parsing, request metadata, and canonical response envelopes. The backend/service owns domain rules and persistence.

## Shared browser packages

A reusable first-party UI package must not force every host to expose the same service-oriented route name. `@876/widgets/browser` therefore keeps its existing Notepad defaults for current hosts but permits host route configuration.

Console installs:

```ts
configureBrowserNotepadRoutes({
  notes: '/api/notes',
  collections: '/api/note-collections',
  adminNotes: '/api/notes/admin',
})
```

at its authenticated browser boundary. Billing, Couriers, and other hosts are unaffected unless they explicitly configure different paths.

## Existing browser clients

Some established Console client modules still contain the former service-shaped constants internally. `src/lib/client/request.ts` normalizes those constants before any browser network request is made. This is an implementation bridge, not a public compatibility route.

New client code must use the Console-owned URL directly. Do not add new mappings merely to preserve a service-shaped browser path.

## Adding another Console surface

1. Identify the resource the administrator is acting on.
2. Verify the canonical operation exists in the owning backend.
3. Expose the operation through `createConsole876Client()` / `$876` when necessary.
4. Add a thin Console route under the resource-oriented URL.
5. Use `requireConsolePermission(...)` with the narrowest appropriate permission.
6. Call the route through the typed Console browser client if client interaction is required.
7. Add route authorization/envelope tests and update `src/lib/api-boundary.test.ts` when a new cross-service top-level resource is introduced.

Do not create `/api/<service>/*`, `/api/integrations/*`, `/api/v1/*`, or a generic catch-all gateway.

## Regression contract

Console CI must ensure that:

- no route handlers exist under `app/api/billing`, `app/api/storage`, or `app/api/widgets`;
- the approved Console-owned cross-service routes exist;
- feature/page/component code does not construct dedicated service clients or read service base URLs;
- browser transport resolves legacy client constants to owned URLs;
- shared Notepad calls use Console's host routes;
- existing permission and canonical-envelope tests continue to pass.
