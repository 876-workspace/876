# `@876/crm`

Typed client and wire contracts for the 876 CRM data service.

## Entrypoints

Authority is selected by the import path. The backing service is the authorization boundary; the entrypoint makes the intended caller tier explicit and scopes the typed surface.

| Import               | Caller                                | Credential                |
| -------------------- | ------------------------------------- | ------------------------- |
| `@876/crm`           | Base client                           | supplied by caller        |
| `@876/crm/service`   | First-party CRM app or backend        | scoped server credential  |
| `@876/crm/operator`  | Console administering an organization | internal key, server-only |
| `@876/crm/contracts` | Types and Zod schemas only            | —                         |

## Usage

### Operator Tier (Console)

Used when administering another organization's workspace from the internal Console.

```ts
import { create876CrmOperatorClient } from '@876/crm/operator'

const crm = create876CrmOperatorClient({
  baseUrl: process.env.CRM_API_URL,
  internalKey: process.env.CRM_INTERNAL_KEY!,
})

const { data, error } = await crm.requests.list(organizationId, {
  status: 'OPEN',
  limit: 25,
})
```

### Service Tier (CRM Web App)

Used by first-party product applications after resolving the organization from the sealed session.

```ts
import { create876CrmServiceClient } from '@876/crm/service'

const crm = create876CrmServiceClient({
  baseUrl: process.env.CRM_API_URL,
  internalKey: process.env.CRM_INTERNAL_KEY!,
})

const { data, error } = await crm.requests.create(organizationId, {
  customerId: 'cus_crm_123',
  subject: 'Support Request: API Webhook Delay',
  priorityId: 'pri_urgent',
})
```

### Provisioning Control Plane

Used by workspace materialization to ensure tenant schemas and default priorities:

```ts
import { create876CrmWorkspaceClient } from '@876/crm'

const workspace = create876CrmWorkspaceClient({
  baseUrl: process.env.CRM_API_URL,
  internalKey: process.env.CRM_INTERNAL_KEY!,
})

const { data, error } = await workspace.ensure(organizationId)
```

### Contracts & Schemas Only

```ts
import {
  crmRequestSchema,
  type CrmRequest,
  type RequestStatus,
} from '@876/crm/contracts'
```

## Conventions

- **Plural Resources:** `customers`, `requests`, `requestNotes`, `teams`, `requestCategories`, `requestPriorities`, `requestTasks`, `requestReminders`, `requestEvents`, `requestForms`.
- **Standardized Verbs:** `create`, `retrieve`, `list`, `update`, `delete`. Workflow verbs such as `publish` and `ensure` are explicit.
- **Envelope Returns:** Every client method returns `{ data, error }`. Failures are values, not thrown exceptions.
- **Timestamps:** Unix seconds represented as `number` in JSON and API contracts.
- **Cross-Service References:** Billing customers and Work tasks are referenced by opaque ID without foreign keys.
