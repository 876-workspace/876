# Implementation Plan: 876 Work / Calendar Widget Phase 6

Run ID: `2026-09-09-work-calendar-widget-phase-6`

Branch: `feat/work-widget-phase-6`

Baseline tree: `main@a147d957d520037f66e3f7ea0004ea36813ebe01` / Phase 5 validated tree `58599a9fc2e112e47ee5d5972177403469b46b53`

Status: `IN_PROGRESS`

## Goal

Phase 6 turns the provider-neutral synchronization seam introduced in Work Phase 2 into a real external-calendar integration plane for Google Calendar, Microsoft Graph Calendar, and CalDAV while keeping 876 Work as the canonical productivity owner and keeping the compact Calendar widget transport-free.

The phase covers secure provider authorization, remote-calendar discovery/linking, incremental event synchronization, provider-neutral mapping/cursor state, manual and scheduler sync entry points, SDK/browser contracts, and a bounded connection-management surface in the Invoice-hosted widget pilot.

## Provider facts that shape the design

- Google Calendar incremental sync is collection-scoped. Initial `events.list` yields `nextSyncToken`; later requests reuse it as `syncToken`. Invalid/expired tokens return HTTP 410 and require a full resync.
- Microsoft Graph v1.0 event delta is calendar-view scoped. The complete `@odata.deltaLink` is opaque state for one calendar and one fixed start/end range and must be persisted/reused as returned.
- CalDAV/WebDAV collection sync is collection-scoped. `DAV:sync-token` is opaque; an out-of-date token requires a full collection synchronization.

Therefore sync state belongs on the CALENDAR mapping, not on the account connection. `WorkSyncConnection.syncCursor` remains compatibility state only and new Phase 6 writes use mapping-level cursor fields.

## Ownership and security

- `apps/work-api` owns OAuth state, credential sealing, provider calls, sync orchestration, conflict policy, remote-calendar linking, mappings, and scheduler behavior.
- `packages/work` owns canonical connection/sync contracts and caller-tier client methods.
- `packages/work-ui` may own controlled connection presentation only; it never receives provider secrets or service URLs.
- `packages/widgets` composes the controlled surface and same-origin browser adapter only.
- `apps/invoice` remains the Phase 6 browser/BFF pilot and authorizes the signed-in Work user before calling Work.
- Raw access tokens, refresh tokens, CalDAV passwords, provider client secrets, and provider error bodies are never serialized to a browser or ordinary Work business rows.
- OAuth refresh credentials are sealed with `@876/core/crypto/secure-field`; deployed environments may use WorkOS Vault and development/tests may use local AES-GCM. Missing secure-field configuration fails closed.

## Sync model

### Connection

One `WorkSyncConnection` represents one user/provider account authorization. It owns provider identity, lifecycle state, and an opaque `credentialRef`.

### Credential

A new Work-owned credential row stores only sealed credential material plus provider/key metadata. `credentialRef` references that row. OAuth connections persist refresh tokens rather than long-lived access tokens; CalDAV stores sealed username/password material. Access tokens are minted/refreshed only at the provider boundary.

### Calendar mapping

A `WorkSyncMapping` with `resourceType=CALENDAR` links one Work calendar to one provider calendar/collection and owns:

- provider cursor/delta-link/sync-token;
- optional Microsoft sync-window start/end;
- last successful sync time and last error code.

Event mappings keep local/remote IDs, ETag, iCalendar UID, content hash, and last sync time.

### Conflict rule

The mapping `contentHash` is the last-synchronized Work representation. During a sync round:

1. pull provider changes first;
2. compare current local content with the mapping hash before applying a remote update;
3. if only remote changed, apply remote;
4. if only local changed, push local;
5. if both changed and provider supplies an update timestamp, newest update wins; otherwise provider state wins rather than silently overwriting an unknown remote change;
6. remote deletion deletes the local event unless the local event changed after the mapping's last successful sync, in which case the local event is recreated remotely;
7. after convergence update ETag/remote ID/hash/cursor atomically at the mapping boundary where possible.

The first implementation synchronizes event resources. Task/TODO provider sync remains outside Phase 6 because Google Tasks and Microsoft To Do are separate APIs and CalDAV VTODO support is not uniform.

## Recurrence and participant scope

Provider sync materializes remote recurring occurrences into Work events for the configured synchronization window rather than inventing a second recurrence engine. Existing Work-native recurrence remains canonical for 876-created series. Provider-side series editing, exception reconciliation, and attendee/organizer write-back are deferred until Work exposes a provider-safe canonical series/exception command.

This preserves useful calendar visibility without corrupting Phase 5 recurrence semantics.

## Microsoft sync window

Microsoft Graph v1.0 delta requires a fixed calendar-view range. Phase 6 uses a rolling default window of one year in the past through three years in the future. The mapping stores that range with the opaque delta link. A sync round that approaches the end of the range clears the delta state and snapshots a fresh window.

## Phase checklist

### Phase 6A — persistence and secure credential foundation

- [ ] Add sealed Work sync credential persistence.
- [ ] Add per-calendar mapping cursor/window/error fields.
- [ ] Hand-write the additive Prisma migration SQL.
- [ ] Add Work secure-field/WorkOS Vault bindings and fail-closed configuration.
- [ ] Harden `credentialRef` so browser/session callers cannot persist inline bearer/token material.
- [ ] Add credential and mapping repository/service tests.

### Phase 6B — provider adapters

- [ ] Implement Google OAuth/token refresh, calendar discovery, incremental event pull, event create/update/delete.
- [ ] Implement Microsoft OAuth/token refresh, calendar discovery, calendar-view delta pull, event create/update/delete.
- [ ] Implement CalDAV credential auth, calendar collection discovery, sync-token pull/full fallback, event PUT/DELETE.
- [ ] Normalize provider payloads into one Work remote-calendar/event contract.
- [ ] Normalize provider failures into stable Work sync error codes without leaking raw responses.
- [ ] Add deterministic provider adapter tests with mocked transport only.

### Phase 6C — connection authorization and remote calendar linking

- [ ] Add authorize command for Google/Microsoft and sealed credential setup for CalDAV.
- [ ] Add single-use hashed OAuth state with expiration.
- [ ] Add public provider callback endpoint bound to state, connection, and provider.
- [ ] Resolve provider account identity after OAuth and persist only safe account metadata.
- [ ] Add remote-calendar discovery.
- [ ] Add link/import and unlink commands for provider calendars.
- [ ] Create a Work calendar/subscription when importing a remote calendar unless an existing local calendar is explicitly linked.

### Phase 6D — sync orchestration

- [ ] Add manual per-connection and per-calendar sync commands.
- [ ] Add scheduler-tier batch sync for active connections.
- [ ] Pull remote changes incrementally using mapping-owned state.
- [ ] Create/update/delete Work events and maintain event mappings.
- [ ] Detect local changes by canonical content hash and push converged non-recurring events.
- [ ] Handle invalid Google/CalDAV cursors with full resync and Microsoft window rollover.
- [ ] Mark connection/mapping health and last error without destroying previous synchronized data.
- [ ] Add race/idempotency/error recovery tests.

### Phase 6E — SDK and Invoice-hosted browser surface

- [ ] Extend `@876/work` session resources with authorize, remote-calendar, link, and sync contracts.
- [ ] Extend same-origin `@876/work/browser` methods only after Invoice BFF routes exist.
- [ ] Add Invoice BFF routes that inject acting user and reject browser-supplied user/credential authority.
- [ ] Add a controlled provider-connection manager to the existing Manage surface.
- [ ] Open provider authorization in a separate browser window; the widget polls/refreshes safe connection state and never handles provider tokens.
- [ ] Keep Calendar/Today/Tasks rendering independent when provider management fails.

### Phase 6F — closeout

- [ ] Add package/API/browser/widget regression tests and count `it()` cases in the final report.
- [ ] Review the diff for provider secret leakage, unsafe URL handling, duplicate OAuth/state helpers, swallowed failures, stale connection cursors, and host/provider ownership leaks.
- [ ] Update this plan/tracker to exact completion state.
- [ ] Write `plans/2026-09-09-work-calendar-widget-phase-6/reports/gpt-web/2026-09-09-work-calendar-widget-phase-6.md`.

## Explicit non-goals / deferrals

- Google Tasks, Microsoft To Do, or CalDAV VTODO synchronization.
- Provider-side recurring-series exception editing and occurrence reconciliation.
- Provider attendee/organizer mutation write-back.
- Push webhooks / Google watch channels / Microsoft change notifications; Phase 6 uses incremental pull and scheduler/manual sync.
- A standalone 876 Work app (Phase 7).
- Generic credential management outside Work sync connections.
- Widget-local provider SDKs, provider secrets, cursors, or sync persistence.

## Verification commands for orchestrator

```bash
pnpm install --lockfile-only
pnpm --filter @876/work typecheck
pnpm --filter @876/work test
pnpm --filter @876/work-api typecheck
pnpm --filter @876/work-api lint
pnpm --filter @876/work-api test
pnpm --filter @876/work-api build
pnpm --filter @876/work-ui typecheck
pnpm --filter @876/widgets typecheck
pnpm --filter @876/widgets test
pnpm --filter @876/widgets test:browser
pnpm --filter @876/invoice-app typecheck
pnpm --filter @876/invoice-app test
pnpm --filter @876/invoice-app build
pnpm check:service-bundle
pnpm check:transpile
```

Database-capable verification must also run the new migration and a Phase 6 sync-schema invariant check before any real provider authorization is attempted.

GPT Web cannot execute these commands: **not executed; verification is the orchestrator's**.
