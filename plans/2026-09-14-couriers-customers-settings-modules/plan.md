# Implementation Plan: Couriers customers, settings, modules, requests & finance

- Run ID: 2026-09-14-couriers-customers-settings-modules
- Status: COMPLETED ✅
- Branch strategy: delegates share the main checkout on disjoint scopes; each phase is split
  into its own branch/PR by path, merged in order, then Vercel prod deploys of touched apps.

## Objectives
1. Fix `auth/invalid-token` on every Couriers session-tier call (branch picker, locations, customer create).
2. One "Create customer" flow that can pick an existing org-customer-registry party or create a new one,
   always producing a Couriers shipping profile (mailbox) — no separate import vs create paths.
3. Couriers canonical modules: customer-portal, deliveries, pre-alerts, packages, customers.
4. Settings context sidebar (Console projects/requests style) with condensed single-page items;
   Users & roles as full-width table + detail card split.
5. `/requests` section + customer Requests tab (opens full-width inside the tab).
6. One Finance settings page (taxes, currencies, payment modes; no tax authorities).

## Key decisions
- **Bearer root cause** was not an expired key: couriers-api demanded `iss`+`aud`, which the 876 session
  token deliberately omits; prod couriers-api had no OAUTH_* env at all. Fixed by JWKS signature check +
  `/oauth/introspect` liveness (Billing's model), `API_URL` added to 876-couriers-api.
- **Customers model**: the registry (billing_customers) is the one party record; a Couriers shipping
  profile is an app-profile (Layer 3) on top of it. "Create customer" = choose-or-create party → create
  profile. A registry customer from Invoice/Billing with no shipping profile does not appear in the
  Couriers list (customer-architecture visibility rule) but is offered in the create flow's search.
  Future apps (careers, events) follow the same shape: their own profile over the one registry party.
- **Customers as a module**: yes, canonical and non-optional (always enabled). A temporary pause of
  *new* customer creation is a platform-controlled rollout concern → feature flag
  `couriers-customers-create` (kill switch), not a module toggle.
- **Commercial module key rename** `delivery` → `deliveries` is a durable-key rename: explicit legacy map.

## Phases / briefs
| Phase | Scope | Delegate | Brief |
| --- | --- | --- | --- |
| A | couriers-api bearer verification | orchestrator (security) | PR #559 |
| B | settings context sidebar + users/roles split | opencode muse-spark-1.3 (max) | [brief](./briefs/opencode/2026-09-14-settings-sidebar.md) |
| C | canonical couriers modules + flag seed | codex gpt-5.6-terra (high) | [brief](./briefs/codex/2026-09-14-couriers-modules.md) |
| D | unified create-customer flow | codex gpt-5.6-terra (high) | [brief](./briefs/codex/2026-09-14-unified-customer-create.md) |
| E | requests section + customer requests tab | codex gpt-5.6-luna (high) | [brief](./briefs/codex/2026-09-14-couriers-requests.md) |
| G | registry-owned errors cleanup (couriers routes/services) | codex gpt-5.6-luna (high) | after D/E/F |
| F | finance settings single page | cline muse-spark-1.3 | [brief](./briefs/cline/2026-09-14-finance-settings.md) |

## Checklist
- [x] A: bearer fix, tests, API_URL on Vercel 876-couriers-api (PR #559)
- [x] B: PR #563 (opencode muse 1.3)
- [x] C: PR #561 (codex terra) + features,plans seeds applied to shared DB 15:09
- [x] D: PR #562 (codex terra; orchestrator removed skipped tests, fixed SDK tests, regenerated OpenAPI snapshot)
- [ ] E
- [ ] F
- [x] A2: introspection envelope fix (PR #560), verified e2e with a live session JWT → 200
- [ ] G: errors via shared registry (user request 14:55)
- [ ] Kill switch must treat an unseeded flag as not paused; seed `couriers-customers-create`
- [ ] Vercel env keys (API_URL couriers-api done; CRM_* on 876-couriers + 876-couriers entry in crm-api CRM_SERVICE_KEYS) for new env vars
- [ ] Merge PRs, deploy 876-couriers, 876-couriers-api, 876-api (+ any other touched app)

## Verification
pnpm --filter @876/couriers-api typecheck lint boundaries test
pnpm --filter @876/couriers-app typecheck lint test
pnpm --filter @876/core test ; pnpm --filter @876/api test (seeds)
node scripts/check-app-structure.mjs

## Handoff
See checklist; reports in ./reports.


## Crash note
2026-09-14 ~15:00 the host OOM-killed all five parallel delegates (7 GB RAM + dev server). Resumed with at most two delegates at once.

## Prod CRM service key rotation (deploy step)
876-crm-api CRM_SERVICE_KEYS is sensitive and unreadable; adding 876-couriers requires rotating every entry (876-invoice, 876-billing, 876-console, 876-crm, 876-couriers) and redeploying crm-api plus those five apps.


## Progress 2026-09-14 (evening)
- [x] E requests — #564; F finance page — #569; G registry errors — #572 (Codex luna + Command Code test repair); session lists + customer kind — #570; Users/Roles split — #571
- [x] H1 Couriers finance scopes — #573; applied: 876-couriers default profile revision 2 published (needed #576 app-role validation fix), connection event delivered to Billing
- [x] H2 payment-mode full resources — #574; H3/H4 currencies + panel controls — #575; H5 items CRUD — #577
- [x] H6 payment-mode images — #579 (orchestrator closed a client-writable image URL gap; migration applied)
- [x] Deploy (19:07–19:25, main e091585ca): CRM service key rotation (crm-api + invoice, billing, console, crm, couriers), CRM_* env on 876-couriers, redeploy api, billing-api, couriers-api, crm-api, couriers, invoice, billing, console, crm
- Known gap: tax rates are immutable in Billing's contract (no edit); needs an effective-dated successor capability.
- Incidents: two OOM crashes (5 parallel delegates; full apps/api vitest beside dev servers); inotify watcher limit raised to 524288 (/etc/sysctl.d/60-inotify-watchers.conf).

- Couriers first prod build failed (server-only @876/crm import in a client component) — fixed in #580, redeployed READY. Prod smoke: couriers-api session bearer 200, couriers /login 200, social redirect_uri = own /callback.
