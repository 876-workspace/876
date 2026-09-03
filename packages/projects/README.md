# `@876/projects`

Typed client and wire contracts for the 876 Projects data service.

## Entrypoints

Authority is selected by the import path, never by a `.admin` segment on a
resource. The backing service is the authorization boundary; the entrypoint
makes the intended caller visible and limits the typed surface.

| Import                    | Caller                             | Credential                |
| ------------------------- | ---------------------------------- | ------------------------- |
| `@876/projects`           | the base client                    | supplied by the caller    |
| `@876/projects/service`   | a first-party 876 app or backend   | scoped server credential  |
| `@876/projects/operator`  | 876 administering any organization | internal key, server-only |
| `@876/projects/contracts` | types and Zod schemas only         | —                         |

`service` and `operator` currently resolve to the same credential class. Treat
the names as caller intent; do not claim they carry distinct keys until the
owning service enforces that.

## Usage

```ts
// Console — operating on another organization's workspace.
import { create876ProjectsOperatorClient } from '@876/projects/operator'

const projects = create876ProjectsOperatorClient({
  baseUrl: process.env.PROJECTS_API_URL,
  internalKey: process.env.PROJECTS_INTERNAL_KEY!,
})

const { data, error } = await projects.issues.list(organizationId, {
  status: 'in-progress',
  limit: 25,
})
```

```ts
// A first-party app, having resolved the organization from its own session.
import { create876ProjectsServiceClient } from '@876/projects/service'

const projects = create876ProjectsServiceClient({ baseUrl, internalKey })
const created = await projects.projects.create(organizationId, {
  name: 'Console Revamp',
})
```

```ts
// Types and schemas, with no client.
import { ISSUE_STATUSES, type Issue } from '@876/projects/contracts'
```

## Conventions

- Resources are plural: `tenants`, `projects`, `issues`, `labels`, `comments`.
- Verbs are `create`, `retrieve`, `list`, `search`, `update`, `delete` — only the
  supported subset is exposed. `tenants.ensure` is a workflow verb, deliberately
  not CRUD.
- An alternate-key lookup goes through `retrieve`, not `retrieveBy*`:
  `issues.retrieve(orgId, 'CONSOLE-12')` and `issues.retrieve(orgId, 'iss_…')`
  are the same method.
- Every call returns `{ data, error }`. Expected failures are values; do not
  rethrow them.
- Timestamps are Unix seconds as `number`.
