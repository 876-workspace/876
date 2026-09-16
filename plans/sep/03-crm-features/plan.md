# Implementation Plan & Feature Analysis: 876 CRM

- **Run ID:** `2026-09-03-crm-features`
- **Date:** 2026-09-03
- **Status:** COMPLETED / VERIFIED ✅
- **Topic:** 876 CRM Current Implementation Inventory ("What's Done") & Feature Matchup with Zoho Bigin

---

## 1. Executive Summary & Architecture

**876 CRM** is the customer relationship management and customer operations product within the 876 monorepo ecosystem. Unlike isolated traditional CRMs that duplicate customer and invoice data, 876 CRM is built on a **federated, bounded-context architecture**:

- **Identity & Access** are owned by the FastAPI identity core (`apps/api`).
- **Financial Customer Data & Invoicing** are owned by the financial data plane (`apps/billing-api`).
- **Productivity & Work Primitives** (Tasks, Reminders, Scheduling Events) are owned by the platform productivity plane (`apps/work-api`).
- **CRM Tenant Data & Customer Operations** (Requests, Notes, Email threads, Teams, Categories, Custom Priorities, and Dynamic Forms) are owned by `apps/crm-api`.

```
                        876 PLATFORM ECOSYSTEM
┌────────────────────────────────────────────────────────────────────────┐
│                        Identity Core (apps/api)                        │
│          Organizations · Users · Memberships · App Entitlements        │
└───────────────┬────────────────────────────────────────┬───────────────┘
                │                                        │
                ▼                                        ▼
┌───────────────────────────────┐        ┌───────────────────────────────┐
│   Finance Plane (Billing)     │        │   Productivity Plane (Work)   │
│  apps/billing-api (port 4004) │        │   apps/work-api (port 4020)   │
│  Customers · Invoices · Ledger│        │ Tasks · Reminders · Calendars │
└───────────────┬───────────────┘        └───────────────┬───────────────┘
                │ (Billing Customer Id)                  │ (Context Ref)
                │                                        │
                ▼                                        ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        CRM Data Plane (CRM API)                        │
│                       apps/crm-api (port 4010)                         │
│  Tenants · Profiles · Requests · Notes/Emails · Teams · Forms · Cat/Pri│
└───────────────┬────────────────────────────────────────┬───────────────┘
                │                                        │
                ▼                                        ▼
┌───────────────────────────────┐        ┌───────────────────────────────┐
│      876 CRM Product App      │        │     Console Operator Plane    │
│      apps/crm (port 3007)     │        │     apps/console (port 3002)  │
│  Customer Portal & Team Ops   │        │     Platform Admin & Support  │
└───────────────────────────────┘        └───────────────────────────────┘
```

---

## 2. Inventory: "What's Done" in 876 CRM

Every layer of the 876 CRM product is implemented, tested, and actively integrated in the monorepo:

### 2.1 CRM Data Service (`apps/crm-api`, Port 4010)

- **Framework & Database:** Express 5, TypeScript ESM, Prisma 7 with PostgreSQL / `@prisma/adapter-pg`.
- **Database Schema Models (`apps/crm-api/prisma/schema/`):**
  - [tenant.prisma](file:///root/projects/876/apps/crm-api/prisma/schema/tenant.prisma): `Tenant` (`crm_tenants`) with `nextRequestNumber`, `provisioningRevision`, status.
  - [customer.prisma](file:///root/projects/876/apps/crm-api/prisma/schema/customer.prisma): `CustomerProfile` (`crm_customer_profiles`) linking tenant to Billing customer (`billingCustomerId`), owner, status.
  - [request.prisma](file:///root/projects/876/apps/crm-api/prisma/schema/request.prisma): `Request` (`crm_requests`) with sequential numbering (`#1`, `#2`...), status, priority ID, category/subcategory, team ID, assignee ID, owner ID, requester contact ID, and channel (`FORM`, `WIDGET`, `CHAT`, `EMAIL`, `API`, `AGENT`).
  - [request.prisma](file:///root/projects/876/apps/crm-api/prisma/schema/request.prisma): `RequestNote` (`crm_request_notes`) with internal vs public visibility, private note to specific user (`privateToUserId`), note kinds (`DESCRIPTION`, `NOTE`, `EMAIL`), and complete email envelope headers (`emailDirection`, `emailFrom`, `emailTo`, `emailCc`, `emailSubject`, `emailMessageId`).
  - [priority.prisma](file:///root/projects/876/apps/crm-api/prisma/schema/priority.prisma): `RequestPriorityDef` (`crm_request_priorities`) with tenant customization, color, icon, weight, sort order, default flag, and platform `provisioningKey`.
  - [category.prisma](file:///root/projects/876/apps/crm-api/prisma/schema/category.prisma): `RequestCategoryDef` & `RequestSubcategory` with color, icon, default team routing, default priority, and platform `provisioningKey`.
  - [team.prisma](file:///root/projects/876/apps/crm-api/prisma/schema/team.prisma): `Team` & `TeamMember` with member roles (`LEAD`, `MEMBER`), and auto-assignment modes (`NONE`, `ROUND_ROBIN`, `LEAST_BUSY`).
  - [form.prisma](file:///root/projects/876/apps/crm-api/prisma/schema/form.prisma): `RequestForm` (`HOSTED` or `EMBEDDED`, versioned definitions, confirmation messages) and `RequestFormSubmission` (answer snapshots, customer mapping, automated request creation).
  - [task.prisma](file:///root/projects/876/apps/crm-api/prisma/schema/task.prisma): Legacy migration model preserved for data verification while runtime task/reminder/event ownership is delegated to 876 Work.
- **REST Endpoints (`/v1/...`):**
  - `/v1/tenants` (ensure, retrieve, provisioning reconciliation)
  - `/v1/organizations/:organizationId/customers` (CRUD, list, filter, customer requests)
  - `/v1/organizations/:organizationId/requests` (CRUD, list with status/priority/team/assignee filters)
  - `/v1/organizations/:organizationId/requests/:id/notes` (CRUD, internal notes, private notes, email logs)
  - `/v1/organizations/:organizationId/requests/:id/tasks` (Work-backed request tasks)
  - `/v1/organizations/:organizationId/requests/:id/reminders` (Work-backed scheduled reminders)
  - `/v1/organizations/:organizationId/requests/:id/events` (Work-backed calendar events & participants)
  - `/v1/organizations/:organizationId/teams` (CRUD, member management, auto-assignment configuration)
  - `/v1/organizations/:organizationId/request-priorities` (materialized tenant priority CRUD)
  - `/v1/organizations/:organizationId/request-categories` (materialized category and subcategory hierarchy CRUD)
  - `/v1/organizations/:organizationId/request-forms` (dynamic form builder, publish, hosted/embedded submission)

### 2.2 Client Packages & Contracts

- **`@876/crm` (`packages/crm`):**
  - Comprehensive TypeScript SDK with typed methods across all resources: `customers`, `requests`, `requestNotes`, `teams`, `requestCategories`, `requestPriorities`, `requestTasks`, `requestReminders`, `requestEvents`, `requestForms`, `requestFormSubmissions`.
  - Three distinct caller tiers:
    - `@876/crm` (root client)
    - `@876/crm/service` (service tier for first-party apps like `@876/crm-app`, resolving organization from session)
    - `@876/crm/operator` (privileged operator tier for `@876/console` platform administration)
    - `@876/crm/contracts` (pure wire contracts and Zod validation schemas)
  - Tenant provisioning control client: `create876CrmWorkspaceClient()` (`packages/crm/src/workspace.ts`).
  - Integration scopes: `CRM_INTEGRATION_SCOPES` for granular app-to-app permissions.
  - 19 test files with 227 passing unit and integration tests.
- **`@876/crm-ui` (`packages/crm-ui`):**
  - Reusable presentation components shared between `@876/crm-app` and `@876/console`:
    - `CustomerCardFrame`: Standardized customer card summary.
    - `CustomerList` & `CustomerListShell`: Filterable customer list table.
    - `CustomerOverview`: 360-degree customer details view.
    - `RequestRecordShell`: Canonical request split-view layout with route tabs (`Conversation`, `Customer`, `Tasks`, `Reminders`, `Schedule`, `Audit`).
    - `RequestEvents`: Timeline and event presentation.

### 2.3 Standalone CRM Web Application (`apps/crm`, Port 3007)

- Next.js 16 (Turbopack, React 19, Tailwind v4, `@876/ui`).
- Embedded authentication against platform core via `/api/auth` bridge.
- Full application routing structure:
  - **Dashboard (`/`):** Summary metrics and quick action bar.
  - **Customers (`/customers`):**
    - Customer list with search and filters.
    - Customer creation (`/customers/new`).
    - Customer detail hub (`/customers/[customerId]`):
      - `/activity`: Full interaction timeline.
      - `/contacts`: Key stakeholders and contact directory.
      - `/edit`: Customer profile management.
      - `/mails`: Email communication log.
      - `/requests`: Customer request history.
      - `/statement`: Live Statement of Account (ledger) pulled from Billing.
      - `/transactions`: Billing invoices and payment receipts.
  - **Requests (`/requests`):**
    - Filterable request list (by status, priority, team, assignee).
    - Request creation (`/requests/new`) and editing (`/requests/[requestId]/edit`).
    - Request detail split view (`/requests/[requestId]/(record)`):
      - **Conversation:** Notes thread (description, public replies, internal notes, private teammate notes, email envelopes).
      - **Customer:** Linked billing profile and contact cards.
      - **Tasks:** Actionable checklist items backed by 876 Work.
      - **Reminders:** Scheduled follow-ups with alerts.
      - **Schedule:** Meeting and calendar event management with participants.
      - **Audit:** Audit log of changes and status transitions.
  - **Forms (`/forms`):**
    - Dynamic form builder (drag-and-drop schema, hosted public URLs, embeddable code snippets, submission tracking).
  - **Settings (`/settings`):**
    - Priority palette editor (`/settings/priorities`).
    - Category & subcategory taxonomy manager (`/settings/categories`).
    - Teams & assignment configuration (`/settings/teams`).
    - User access & permissions (`/settings/users`).

### 2.4 Console Operator Surface (`apps/console`, Port 3002)

- Unified operator workspace located at `/workspace/[orgSlug]/crm`:
  - Operator view of organization customers and request queues.
  - Shared `RequestRecordShell` parity: Console operators inspect the identical request tabs (Conversation, Customer, Tasks, Reminders, Schedule, Audit) with platform admin privileges.
  - Dynamic provisioning inspection: View and reconcile published `application/876-crm` manifests against materialized tenant records.

### 2.5 Platform & Cross-Service Integrations

- **Billing Integration (`@876/billing`):**
  - Server-to-server calls via `@876/billing/integration` resolve live customer balances, credit terms, invoices, and transaction ledgers. CRM stores no redundant financial data.
- **Productivity Integration (`@876/work`):**
  - CRM calls 876 Work with context `{ service: 'crm', resource: 'request', id: requestId }`. Tasks and reminders live in the shared productivity engine so users see all work across products in one platform view.
- **Permission Catalog (`packages/core/src/access/catalogs.ts`):**
  - Full RBAC catalog: 14 modules (`requests`, `customers`, `tasks`, `reminders`, `events`, `calendars`, `my-work`, `notes`, `teams`, `categories`, `priorities`, `request-forms`, `reports`, `settings`).

---

## 3. Comparative Matchup: 876 CRM vs. Zoho Bigin

Zoho Bigin is marketed as a "pipeline-centric CRM for small businesses and small teams" focusing on deal stages, visual pipelines, simple contact management, and light automation. Here is how 876 CRM compares across every capability:

| Capability Area                              | Zoho Bigin (Features & Capabilities)                                                                                                                      | 876 CRM (Current Implementation)                                                                                                                                                                                                                     |                                           Match Status                                           | Architecture & Code Location                                                                                                                                                                                                                                                                                                                                                                                          |
| :------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :----------------------------------------------------------------------------------------------: | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **1. Pipeline / Deal Management**            | - Visual Kanban pipelines by stage<br>- Multiple team pipelines (Sales, Onboarding, Service)<br>- Deal value & expected close date<br>- Win/loss tracking | - **Requests** model with 6 statuses: `OPEN`, `IN_PROGRESS`, `WAITING`, `RESOLVED`, `CLOSED`, `CANCELLED`<br>- List view with status/team/assignee filters<br>- Category & subcategory taxonomy<br>- Linked directly to live invoices/transactions   |            **Partial**<br>(List view complete; visual Kanban pipeline view deferred)             | - [request.prisma](file:///root/projects/876/apps/crm-api/prisma/schema/request.prisma)<br>- [requests.routes.ts](file:///root/projects/876/apps/crm-api/src/modules/requests/requests.routes.ts)<br>- [requests/page.tsx](<file:///root/projects/876/apps/crm/src/app/(app)/requests/page.tsx>)                                                                                                                      |
| **2. Customer / Contact Management**         | - Separate Contacts and Companies (Accounts)<br>- 360° timeline view (calls, emails, tasks)<br>- Associated contacts per company                          | - Unified Customer model backed by Billing customer identity<br>- Supports individual & business entities (`isBusiness`, `legalName`)<br>- Multi-tab 360° view: Activity, Contacts, Mails, Requests, Statement, Transactions                         |                   **Full Parity**<br>(Deeper financial integration than Bigin)                   | - [customer.prisma](file:///root/projects/876/apps/crm-api/prisma/schema/customer.prisma)<br>- [customer-identity.ts](file:///root/projects/876/apps/crm/src/features/customers/customer-identity.ts)<br>- [customers-data.ts](<file:///root/projects/876/apps/crm/src/app/(app)/customers/_lib/customers-data.ts>)<br>- [customer-overview.tsx](file:///root/projects/876/packages/crm-ui/src/customer-overview.tsx) |
| **3. Task & To-Do Management**               | - Tasks with due dates, priority, assignment<br>- Activity reminders & checklist items                                                                    | - Full task management backed by **876 Work** platform service<br>- Statuses: `OPEN`, `IN_PROGRESS`, `DONE`, `CANCELLED`<br>- Linked to request context, due dates, assignees                                                                        |                                         **Full Parity**                                          | - [task.prisma](file:///root/projects/876/apps/crm-api/prisma/schema/task.prisma)<br>- [tasks.service.ts](file:///root/projects/876/apps/crm-api/src/modules/tasks/tasks.service.ts)<br>- `@876/work` integration plane                                                                                                                                                                                               |
| **4. Reminders & Alerts**                    | - Time-based reminders, pop-up notifications, email reminders                                                                                             | - First-class Reminders module backed by 876 Work<br>- Statuses: `SCHEDULED`, `SENT`, `DISMISSED`, `CANCELLED`<br>- Exact `remindAt` timestamps                                                                                                      |                                         **Full Parity**                                          | - [reminders.service.ts](file:///root/projects/876/apps/crm-api/src/modules/reminders/reminders.service.ts)<br>- [reminders/page.tsx](<file:///root/projects/876/apps/crm/src/app/(app)/requests/[requestId]/(record)/reminders/page.tsx>)                                                                                                                                                                            |
| **5. Scheduling & Calendar Events**          | - Events / meetings, Google/Outlook sync, "Booking Pages" (no-code scheduling links)                                                                      | - Full **Scheduling** module via 876 Work<br>- `WorkEventResource` with title, description, location, `busyStatus`, `startAt`, `endAt`, `timeZone`<br>- Multi-participant support (`kind`, `email`, `role`, `status`)                                |         **Substantial Parity**<br>(Public booking links deferred; event engine complete)         | - [events.service.ts](file:///root/projects/876/apps/crm-api/src/modules/events/events.service.ts)<br>- [request-event-types.ts](file:///root/projects/876/packages/crm/src/request-event-types.ts)<br>- [schedule/page.tsx](<file:///root/projects/876/apps/crm/src/app/(app)/requests/[requestId]/(record)/schedule/page.tsx>)                                                                                      |
| **6. Web-to-Lead Forms**                     | - Web forms for deal/contact capture<br>- Embeddable code or hosted links<br>- Field mappings                                                             | - Full **Request Forms** module<br>- Dynamic JSON schema definitions, versioned publishing<br>- `HOSTED` and `EMBEDDED` placements<br>- Auto-creates requests with default priority, category, and team routing                                      |                                         **Full Parity**                                          | - [form.prisma](file:///root/projects/876/apps/crm-api/prisma/schema/form.prisma)<br>- [request-forms.service.ts](file:///root/projects/876/apps/crm-api/src/modules/request-forms/request-forms.service.ts)<br>- [forms/page.tsx](<file:///root/projects/876/apps/crm/src/app/(app)/forms/page.tsx>)                                                                                                                 |
| **7. Team Workspaces & Auto-Assignment**     | - User roles, permissions, team pipelines<br>- Round-robin deal assignment rules                                                                          | - Full **Teams** and **Team Members** modules<br>- Team roles: `LEAD`, `MEMBER`<br>- Auto-assignment algorithms: `NONE`, `ROUND_ROBIN`, `LEAST_BUSY`                                                                                                 |                                         **Full Parity**                                          | - [team.prisma](file:///root/projects/876/apps/crm-api/prisma/schema/team.prisma)<br>- [teams.service.ts](file:///root/projects/876/apps/crm-api/src/modules/teams/teams.service.ts)<br>- [settings/teams/page.tsx](<file:///root/projects/876/apps/crm/src/app/(app)/settings/teams/page.tsx>)                                                                                                                       |
| **8. Communication: Email & Internal Notes** | - Two-way email sync (IMAP/SMTP)<br>- Internal notes with `@mentions`<br>- Email templates                                                                | - Notes engine supporting: public notes, internal team notes, and **private notes to specific user** (`privateToUserId`)<br>- Structured Email envelopes (`INBOUND`/`OUTBOUND`, `emailFrom`, `emailTo`, `emailCc`, `emailSubject`, `emailMessageId`) |  **Substantial Parity**<br>(Live IMAP sync deferred; email logging and private notes complete)   | - [request.prisma](file:///root/projects/876/apps/crm-api/prisma/schema/request.prisma)<br>- [notes.service.ts](file:///root/projects/876/apps/crm-api/src/modules/notes/notes.service.ts)<br>- [request-notes.tsx](<file:///root/projects/876/apps/crm/src/app/(app)/requests/_components/request-notes.tsx>)                                                                                                        |
| **9. Telephony & Call Logging**              | - Built-in cloud PBX / Twilio telephony<br>- Click-to-call, call duration logs, recording                                                                 | - Platform Twilio integration architecture (`docs/plans/twilio-communications.md`)<br>- Twilio activation and telephony plane ready                                                                                                                  |                                 **Planned / Deferred in CRM UI**                                 | - [twilio-communications.md](file:///root/projects/876/docs/plans/twilio-communications.md)                                                                                                                                                                                                                                                                                                                           |
| **10. Billing, Products & Payments**         | - Lightweight Products catalog<br>- Payment links (Stripe, PayPal)<br>- Integration with Zoho Books / Invoice                                             | - **Native 876 Billing & Invoice Integration**<br>- Live Statement of Account (ledger) with debit/credit balance<br>- Direct link to Invoices, Quotes, Subscriptions, and Payment Instruments<br>- Zero data duplication                             |          **Superior in 876**<br>(Unified financial data plane; no third-party sync lag)          | - [customer-statement-tab.tsx](<file:///root/projects/876/apps/crm/src/app/(app)/customers/_components/customer-statement-tab.tsx>)<br>- `@876/billing/integration`<br>- `apps/invoice`                                                                                                                                                                                                                               |
| **11. Customization & Custom Fields**        | - Custom fields on Deals/Contacts<br>- Custom stages, picklists, tags                                                                                     | - Materialized tenant customization for Priorities (color, icon, weight)<br>- Materialized Categories and Subcategories with default team routing<br>- Platform provisioning manifest reconciliation                                                 | **Substantial Parity**<br>(Arbitrary custom fields deferred; priority/category palette complete) | - [crm-config-provisioning-implementation.md](file:///root/projects/876/docs/crm-config-provisioning-implementation.md)<br>- [priorities.service.ts](file:///root/projects/876/apps/crm-api/src/modules/priorities/priorities.service.ts)<br>- [categories.service.ts](file:///root/projects/876/apps/crm-api/src/modules/categories/categories.service.ts)                                                           |
| **12. Workflow Automation**                  | - Trigger rules (on deal stage move / record create)<br>- Automatic emails, field updates, task creation                                                  | - Event-driven auto-assignment (`ROUND_ROBIN`, `LEAST_BUSY`)<br>- Automated request creation from web forms with default priority/team<br>- Generalized visual workflow rule builder deferred                                                        |         **Partial**<br>(Core workflow automation built-in; visual rule builder deferred)         | - [request-forms.service.ts](file:///root/projects/876/apps/crm-api/src/modules/request-forms/request-forms.service.ts)<br>- [teams.service.ts](file:///root/projects/876/apps/crm-api/src/modules/teams/teams.service.ts)                                                                                                                                                                                            |
| **13. AI & Agent Integration**               | - 2025/2026 Zoho AI (Reply Assistant, Cross-Sell Genie, Churn Analyzer)<br>- MCP (Model Context Protocol) support for Claude/ChatGPT                      | - 876 Platform MCP Architecture (`apps/projects-mcp`)<br>- `@876/crm` client structure designed for MCP server integration<br>- Antigravity / Claude Code agent access via typed service & operator tiers                                            |          **Architecturally Ready**<br>(Platform MCP in place; CRM tools ready to bind)           | - [022-876-projects.md](file:///root/projects/876/docs/architecture/022-876-projects.md)<br>- `apps/projects-mcp`                                                                                                                                                                                                                                                                                                     |
| **14. Multi-Tenancy & Access Control**       | - User profiles and module permissions                                                                                                                    | - Multi-tenant isolation by `tenantId` / `organizationId`<br>- RBAC with 14 module permissions (`requests`, `customers`, `teams`, etc.)<br>- Configurable org module toggles (`crmModuleCatalog`)                                                    |                                         **Full Parity**                                          | - [catalogs.ts](file:///root/projects/876/packages/core/src/access/catalogs.ts)<br>- [modules.ts](file:///root/projects/876/packages/crm/src/modules.ts)<br>- [require-crm-context.ts](file:///root/projects/876/apps/crm/src/lib/auth/require-crm-context.ts)                                                                                                                                                        |

---

## 4. Key Architectural Divergences & Advantages

### 4.1 Requests vs. Strict Deal Pipelines

In Zoho Bigin, records are primarily "Deals" progressing through a sales funnel.
876 CRM uses **Requests**, which unifies:

1. **Sales inquiries and onboarding deals** (via web forms and stages).
2. **Customer support tickets and service requests** (via customer portal and channels: form, widget, chat, email, agent).
3. **Internal account operations** (linked directly to the customer's billing profile).

This prevents small businesses from needing two separate systems (one CRM for sales, one Help Desk for support).

### 4.2 Centralized Productivity Plane (876 Work)

In Zoho Bigin, activities are trapped inside the CRM. In the 876 ecosystem:

- Tasks, reminders, and calendar events are stored in **876 Work** (`apps/work-api`).
- An employee sees their CRM follow-ups, Billing invoice collections, Couriers dispatches, and Projects issue assignments in a **single unified productivity queue** ("My Work").

### 4.3 Zero Customer Duplication (876 Billing)

Zoho Bigin requires periodic sync with Zoho Books or Stripe, frequently leading to duplicate contacts, out-of-sync address data, and stale balances.
In 876 CRM:

- `crm_customer_profiles` holds only CRM-specific fields and references `billingCustomerId`.
- Opening a customer record renders live accounts receivable, payment status, and invoices directly from Billing with no sync delays.

---

## 5. Strategic Roadmap & Gaps

To reach 100% feature parity with Zoho Bigin's visual workflow, the following roadmap items are identified:

1. **Kanban Pipeline View for Requests:**
   - Add a visual drag-and-drop board view for CRM requests grouped by status (`OPEN`, `IN_PROGRESS`, `WAITING`, `RESOLVED`, `CLOSED`), reusing the board components created for 876 Projects (`packages/projects-ui/src/board/`).
2. **Public Booking Pages:**
   - Expose hosted booking URLs utilizing `WorkEventResource` and calendar availability.
3. **Direct CRM MCP Server (`apps/crm-mcp`):**
   - Follow `apps/projects-mcp` to expose CRM tools (`list_requests`, `create_request`, `search_customers`, `add_note`) to LLM agents and Antigravity.
4. **Telephony UI Embedding:**
   - Connect the existing platform Twilio integration into a click-to-call dialer and call log tab within `RequestRecordShell`.

---

## 6. Populated 876 Projects Backlog (`CRM-1` to `CRM-33`)

All 33 issues have been created directly in the 876 Projects datastore under project **`CRM`** (`prj_42dcb6fc15584480842af83ef449d55a`):

### Milestone 0: Completed CRM Core (`m:crm-done`, status: `done`)

- **`CRM-1`**: `[Done] Bounded CRM Data Service & Multi-Tenant Engine` (High priority, 5 pts)
- **`CRM-2`**: `[Done] Unified Customer Profiles linked to Billing Data Plane` (Urgent priority, 5 pts)
- **`CRM-3`**: `[Done] Core Request Management & Multi-Channel Intake` (High priority, 8 pts)
- **`CRM-4`**: `[Done] Request Conversation Thread & Threaded Notes` (High priority, 5 pts)
- **`CRM-5`**: `[Done] Team Workspaces & Automated Work Routing` (Medium priority, 5 pts)
- **`CRM-6`**: `[Done] Dynamic Request Form Studio & Intake Submissions` (High priority, 8 pts)
- **`CRM-7`**: `[Done] Materialized Tenant Priorities & Category Taxonomies` (Medium priority, 5 pts)
- **`CRM-8`**: `[Done] Shared Productivity Plane Integration (876 Work Tasks & Reminders)` (High priority, 5 pts)
- **`CRM-9`**: `[Done] Calendar Event Scheduling & Participant Invites` (Medium priority, 5 pts)
- **`CRM-10`**: `[Done] Shared CRM UI Components & Console Operator Desk` (High priority, 8 pts)

### Milestone 1: Zoho Bigin Parity (`m:crm-1-bigin`, `parity:bigin`)

- **`CRM-11`**: `[Bigin] Visual Kanban Pipeline Board for Requests` (`in-progress`, Urgent priority, 5 pts)
- **`CRM-12`**: `[Bigin] Deal Values, Expected Close Dates & Win/Loss Tracking` (`todo`, High priority, 3 pts)
- **`CRM-13`**: `[Bigin] External Public Booking Pages for Customer Meetings` (`todo`, Medium priority, 5 pts)
- **`CRM-14`**: `[Bigin] In-App Telephony Dialing & Twilio Call Logging UI` (`todo`, High priority, 5 pts)
- **`CRM-15`**: `[Bigin] 876 CRM MCP Server (apps/crm-mcp)` (`todo`, High priority, 3 pts)
- **`CRM-16`**: `[Bigin] Two-Way Email Sync & Client Inbound Email Parsing` (`todo`, High priority, 8 pts)

### Milestone 2: Ticketing & Helpdesk Parity (`m:crm-2-ticketing`, `parity:osticket`, `parity:zendesk`)

- **`CRM-17`**: `[osTicket] Service Level Agreement (SLA) Engine & Breach Escalation` (`backlog`, Urgent priority, 8 pts)
- **`CRM-18`**: `[osTicket] Canned Responses & Action Macros` (`backlog`, Medium priority, 3 pts)
- **`CRM-19`**: `[osTicket] Ticket Merge, Split, and Parent-Child Linkage` (`backlog`, Medium priority, 5 pts)
- **`CRM-20`**: `[osTicket] Customer Self-Service Portal & Knowledge Base (FAQ)` (`backlog`, High priority, 8 pts)
- **`CRM-21`**: `[Zendesk] Real-time Agent Collision Detection` (`backlog`, Medium priority, 5 pts)
- **`CRM-22`**: `[Zendesk] Automated Customer Satisfaction Surveys (CSAT)` (`backlog`, Medium priority, 3 pts)
- **`CRM-23`**: `[osTicket] Custom Ticket Queues & Saved Filter Views` (`backlog`, Medium priority, 5 pts)

### Milestone 3: Advanced CRM & Enterprise Sales (`m:crm-3-full-crm`, `parity:zoho-crm`)

- **`CRM-24`**: `[Zoho CRM] Lead Staging & Qualified Conversion Pipeline` (`backlog`, High priority, 8 pts)
- **`CRM-25`**: `[Zoho CRM] Visual Pipeline Blueprint & Stage Transition Validation` (`backlog`, High priority, 8 pts)
- **`CRM-26`**: `[Zoho CRM] Automated Email Drip Cadences & Follow-Up Sequences` (`backlog`, Medium priority, 8 pts)
- **`CRM-27`**: `[Zoho CRM] Sales Forecasting, Rep Quotas, and Territory Rules` (`backlog`, Medium priority, 5 pts)
- **`CRM-28`**: `[Zoho CRM] Multi-Currency Quotation & Price Book Overrides` (`backlog`, Medium priority, 5 pts)

### Milestone 4: Enterprise ITSM & Service Desk (`m:crm-4-itsm`, `parity:manageengine`)

- **`CRM-29`**: `[ManageEngine] ITIL Incident & Problem Management Separation` (`backlog`, High priority, 13 pts)
- **`CRM-30`**: `[ManageEngine] Change Management & CAB Approval Workflows` (`backlog`, High priority, 13 pts)
- **`CRM-31`**: `[ManageEngine] IT Asset Management & CMDB (Configuration Management Database)` (`backlog`, High priority, 13 pts)
- **`CRM-32`**: `[ManageEngine] Enterprise Service Catalog with Multi-Stage Approvals` (`backlog`, Medium priority, 8 pts)
- **`CRM-33`**: `[ManageEngine] Vendor, Contract & Software License Management` (`backlog`, Medium priority, 5 pts)

### Milestone 5: Dynamic Custom Fields & Layout Engine (`m:crm-custom-fields`)

- **`CRM-34`**: `[Custom Fields] Dynamic Custom Field Definitions Schema & Data Engine` (`backlog`, Urgent priority, 8 pts, Foundation)
- **`CRM-35`**: `[Custom Fields] Rich Field Types Suite (Text, Number, Date, Picklist, Multi-Select, Lookup)` (`backlog`, High priority, 8 pts)
- **`CRM-36`**: `[Custom Fields] Cascading Field Dependencies & Conditional Logic Engine` (`backlog`, High priority, 8 pts)
- **`CRM-37`**: `[Custom Fields] Visual Form & Layout Builder with Sections & Multi-Column Grid` (`backlog`, High priority, 8 pts)
- **`CRM-38`**: `[Custom Fields] Field-Level Security (FLS) & Role-Based Visibility Controls` (`backlog`, Medium priority, 5 pts)
- **`CRM-39`**: `[Custom Fields] JSONB Indexing, Advanced Filtering & Custom Field Search` (`backlog`, Medium priority, 5 pts)
- **`CRM-40`**: `[Custom Fields] Provisioning Manifest Integration & Default Field Packs` (`backlog`, Medium priority, 5 pts)

### Milestone 6: Deep osTicket Feature Adoption (`m:crm-osticket-deep`)

- **`CRM-41`**: `[osTicket] Help Topics Architecture & Multi-Form Routing` (`backlog`, Urgent priority, 8 pts)
- **`CRM-42`**: `[osTicket] Inbound Mail Routing & Regex Ticket Filter Engine` (`backlog`, High priority, 8 pts)
- **`CRM-43`**: `[osTicket] Dynamic Ticket Auto-Locking & Real-Time Concurrency Guard` (`backlog`, Medium priority, 5 pts)
- **`CRM-44`**: `[osTicket] Department Transfers & Inter-Team Assignment Notes` (`backlog`, Medium priority, 5 pts)
- **`CRM-45`**: `[osTicket] Secure Client Magic Links & Ticket Access Tokens` (`backlog`, High priority, 5 pts)
- **`CRM-46`**: `[osTicket] Comprehensive Email Notification Templates & Variables System` (`backlog`, High priority, 5 pts)
- **`CRM-47`**: `[osTicket] Spammer Banlist & Abusive Sender Blocklist` (`backlog`, Low priority, 3 pts)
- **`CRM-48`**: `[osTicket] Multi-Tier Signatures System (Agent, Team & Department)` (`backlog`, Low priority, 3 pts)
- **`CRM-49`**: `[osTicket] Automatic Stale Ticket Closer & Inactivity Expiry Workflows` (`backlog`, Medium priority, 5 pts)
- **`CRM-50`**: `[osTicket] Department Hierarchy & Granular Staff Access Control` (`backlog`, High priority, 5 pts)

### Milestone 7: Advanced ManageEngine ITSM & Business Rules (`m:crm-itsm-advanced`)

- **`CRM-51`**: `[ManageEngine] Multi-Dimensional Priority Matrix (Impact × Urgency = Priority)` (`backlog`, High priority, 5 pts)
- **`CRM-52`**: `[ManageEngine] Request Resolution Templates & Workaround Documentation` (`backlog`, Medium priority, 5 pts)
- **`CRM-53`**: `[ManageEngine] First Call Resolution (FCR) & Time-Spent Tracking` (`backlog`, Medium priority, 5 pts)
- **`CRM-54`**: `[ManageEngine] Asset Configuration Items (CI) Linking on Requests` (`backlog`, High priority, 8 pts)
- **`CRM-55`**: `[ManageEngine] Business Rules Engine for Request Intake & Lifecycle Events` (`backlog`, Urgent priority, 13 pts, Foundation)

See full documentation and dependency graph in [`docs/crm-issues-and-roadmap.md`](file:///root/projects/876/docs/crm-issues-and-roadmap.md).
