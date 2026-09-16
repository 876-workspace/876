# Transactional Email

Read this before sending, composing, rendering, templating, or storing **any**
outbound email in any 876 app or service — an invoice or quote to a customer, a
payment reminder, a courier shipment notification, an onboarding or plan-change
notice, or anything 876 itself sends on its own behalf.

Companion to `.claude/rules/platform-services.md` (bounded contexts),
`.claude/rules/access-tiers.md` (whose authority sends), `.claude/rules/naming.md`,
and `.claude/rules/external-docs.md` (provider contracts must be read, not recalled).

Zoho is the industry reference for the organization-facing shape of this feature,
and 876 deliberately mirrors its model: an organization authenticates its own
domain, verifies sender identities, owns per-category templates, and composes a
message before sending it.

## Position

**876 Communications (`apps/communications-api`) is the only thing that sends
email.** It owns sending domains, sender identities, templates, deterministic
rendering, delivery records, and provider integration. Every other service owns
its own business meaning and asks Communications to deliver.

```text
product service (Billing, Couriers, Core…)   owns WHAT is being said and WHY
        ↓ one service-tier call
876 Communications                            owns composition + delivery + evidence
        ↓ provider adapter only
Resend                                        owns the wire
```

Consequences, none optional:

- **No app, service, package, or browser may hold a provider API key** or
  construct a provider client. Only `apps/communications-api/src/providers/**`
  knows the provider's request/response spelling.
- **No product service grows its own email tables**, template store, or send
  helper. A second sender is a defect, not a shortcut.
- Cross-context references (`organizationId`, customer ids, document ids) are
  **opaque strings with no cross-database foreign key**.
- A product service reaches Communications through `@876/communications/service`
  at first-party service authority — never from a browser, never from a Next.js
  route handler that has not authorized first.

## The four resources

| Resource     | Answers                                            | Mutability                      |
| ------------ | -------------------------------------------------- | ------------------------------- |
| **Domain**   | Which domains may this org send from?              | configuration, soft-deleted     |
| **Sender**   | Which From identities are verified and active?     | configuration, soft-deleted     |
| **Template** | What does this category of message say?            | configuration, soft-deleted     |
| **Delivery** | What was actually sent, to whom, and what happened | **immutable historical record** |

A `Delivery` and its provider events are **evidence**. They are never edited,
never hard-deleted, and never rewritten when the customer, sender, or template
later changes. Everything a sent message contained — from address, recipients,
subject, rendered body — is **snapshotted onto the delivery row** at send time, so
a two-year-old send renders identically after the template is edited. Reading a
live template to display a historical delivery is a defect.

Configuration resources follow `.claude/rules/deletions.md` tombstones.

## Sending identity

Every sender declares **how** it is delivered. An organization must be able to
send on day one, with no DNS work, so the `managed` method is the default
and the other two are upgrades onto the same `Sender` record and the same
provider boundary.

| `kind`           | Org setup required          | From address           | DMARC aligns to    |
| ---------------- | --------------------------- | ---------------------- | ------------------ |
| `managed`        | **none** — always available | `<org>@mail.87six.dev` | 876                |
| `custom-domain`  | publish DKIM/SPF records    | `billing@acme.com`     | the organization   |
| `linked-mailbox` | OAuth Gmail / Microsoft 365 | the org's real mailbox | the org's provider |

Rules for the free `managed` method:

- It is backed by **one** verified platform domain, registered with the provider
  once. Per-organization identity is the **local part and display name**, not a
  per-organization subdomain — so onboarding an organization costs zero DNS
  writes and zero provider calls.
- The local part is derived from the organization's durable slug and is
  **server-assigned**. A client never chooses it, and it is never taken from a
  display name a user can edit.
- **Reply-to is the organization's own address**, so a customer replying reaches
  the organization and not 876.
- The message must make the sending organization unmistakable in the display
  name. It must never be presented as if the organization had authenticated its
  own domain.
- Because every organization on this method shares 876's sending reputation,
  abuse by one organization harms all of them. Treat rate limiting, bounce and
  complaint handling, and Console's power to suspend sending as requirements of
  this method, not as later polish.
- Upgrading to `custom-domain` must not rewrite history: existing deliveries keep
  their snapshotted from-address.

`linked-mailbox` is deliberately **not implemented yet**. When it is, it is a
provider adapter behind the existing boundary — a per-organization OAuth
credential, refresh handling, and send through the mailbox API — not a second
email subsystem and not a credential any product app or browser ever holds. Do
not scaffold its tables, routes, or settings UI before it is being built.

- **A custom sender requires a verified domain owned by the same organization.**
  Never send from an address whose domain is unverified, belongs to another
  organization, or is merely claimed.
- Exactly one **effective default sender** per organization. A send that names no
  sender uses it. Because a `managed` sender is provisioned for every
  organization, "no active sender" means provisioning did not run — resolve it by
  ensuring the deterministic `managed` sender, never by inventing a from-address
  at send time from a display name, a request field, or an environment default.
- **876's own platform mail** (onboarding, plan notices, operator mail) sends from
  the platform sending domain, held in **one named constant**. It is never
  interpolated from a request, a header, or an environment default that could
  silently become wrong.
- Validate a sender's ownership and active state **server-side at send time**, not
  only when the composer was prepared. The prepared composition is a suggestion;
  the send is the authorization boundary.

## Templates and rendering

Templates are per-organization, scoped to a **category** that names the business
event (`invoice`, `quote`, `payment-reminder`, `shipment-received`,
`shipment-ready`, `shipment-delivered`). Category keys are durable kebab-case
identifiers under `.claude/rules/naming.md` — renaming one is a coordinated
migration, not a refactor. Exactly one template is default per category, and 876
ships system templates an organization may override but not delete.

Rendering is **deterministic, side-effect free, and explicit**:

- **Variables are a flat map of primitives supplied by the caller.** No walking a
  domain object, no passing a Prisma row or a provider DTO into a template, and no
  resolving dotted paths into nested structures.
- **Read only own properties.** Use `Object.hasOwn`, never a bare index — a bare
  `variables[key]` resolves inherited properties, so `{{toString}}`,
  `{{constructor}}`, and `{{__proto__}}` silently render garbage into a customer's
  email instead of failing as a missing variable. Test that corpus explicitly.
- **A missing variable fails the render.** It never renders an empty string, the
  literal placeholder, or `undefined` into a message a customer will read.
- **Escape by context.** HTML bodies are HTML-escaped. Headers (subject, names)
  are rejected if they contain CR or LF **after** rendering — header injection is
  checked on the rendered value, not the template.
- **Preview and prepare never send.** A composer that renders a preview must have
  no delivery side effect whatsoever.

## Composing before sending

Following Zoho: the user sees and may edit From, To, CC, BCC, subject, and body
before sending, with the document attached or linked. That freedom is the product,
and it is also the abuse surface, so:

- **Bound every list and field** — a maximum recipient count across To + CC + BCC
  together that does not exceed the provider's documented per-send limit, a
  maximum subject length, and a maximum body size. Do not rely on the HTTP body
  limit as the only bound.
- The **default recipient is the document's own customer contact**, resolved
  server-side. A client never gets to decide who the customer is.
- Every send is attributed to an **actor** and recorded on the delivery, because
  the organization's and the platform's sending reputation are shared.

## Idempotency

**Local idempotency is canonical; the provider's idempotency key is defence in
depth.** The caller supplies a deterministic key derived from the business
operation, and a replay of that key returns the original delivery rather than
sending a second message.

When a send spans two services — provider acceptance in Communications, then a
lifecycle record in the owning service — the provider call happens **first** and
the deterministic delivery key is the recovery mechanism: a retry replays the
existing delivery and only re-attempts the local record, so a crash in that window
can never send a duplicate email. Document that ordering wherever it is relied on.

## Webhooks

- Verify the **signature over the raw request body**, before any JSON parsing. The
  raw-body parser must be registered ahead of the JSON parser on that path.
- Reject on a missing secret, a stale timestamp outside the tolerance window, or a
  signature mismatch. Compare in constant time.
- **Ingestion is append-safe and idempotent**: deduplicate by the provider's event
  id, and never let a late or out-of-order event regress an aggregate status. A
  terminal state (bounced, complained, failed) wins and is never overwritten by an
  earlier progress event.
- Keep the provider's event id and 876's own event id distinct.

## Console jurisdiction

Console is the operator plane and has final authority over every organization's
email configuration: inspect and repair domains and senders, read delivery history
and provider events, manage system templates, and suspend an organization's
sending. It reaches Communications through the **operator** entrypoint, authorizes
with `requireConsolePermission` first, and writes an audit event for any read of
customer-identifying delivery content and for every mutation.

Console never bypasses Communications to call the provider directly.

## What never goes in an email

Never put a session token, API key, internal key, password, full payment
credential, or sensitive identifier (TRN, passport) in a subject, body, or log
line. Rendered bodies are stored as delivery evidence, so anything interpolated
into one is persisted — treat the variable map as data that will be kept.

## Adding a new email to a product

1. Name the **category** and add its system template — do not inline copy at a
   call site.
2. Add or reuse the capability in the **owning** service; it resolves recipients,
   builds the flat variable map, and calls Communications once.
3. Call the typed `@876/communications/service` entrypoint. Never a raw `fetch`,
   never the provider.
4. Derive a deterministic idempotency key from the business operation.
5. Return the delivery as a value; render failures inline per
   `.claude/rules/error-handling.md` — a failed send never tears down page chrome.
6. Cover the negative space: no verified sender, missing variable, header
   injection, provider failure, replay, and cross-organization access.

## Scheduling

Reminders and any future scheduled mail use a **durable queue/worker**, never an
in-process timer, a browser timer, or a request-scoped `setTimeout`. A scheduled
send is idempotent on its own key so a worker retry cannot double-send.

## Do not

- Do not send email from anywhere but 876 Communications.
- Do not hold or forward a provider API key outside the provider adapter.
- Do not let a product service create its own email tables or send helper.
- Do not send from an unverified domain or another organization's sender.
- Do not silently fall back to a platform sender when an org has none.
- Do not render a template from anything but an explicit flat primitive map.
- Do not index a variable map without an own-property check.
- Do not render a missing variable as empty.
- Do not check header injection on the template instead of the rendered value.
- Do not mutate, rewrite, or hard-delete a delivery record or provider event.
- Do not render a historical delivery from live template/sender/customer rows.
- Do not verify a webhook against a re-serialized body.
- Do not let a late provider event regress a terminal delivery status.
- Do not accept an unbounded recipient list, subject, or body.
- Do not schedule mail on an in-process timer.
- Do not let a client choose a `managed` sender's local part, or present a
  `managed` sender as a domain the organization authenticated.
- Do not create a per-organization subdomain or provider domain record for the
  free `managed` method.
- Do not scaffold linked-mailbox tables, routes, or settings before it is built.
