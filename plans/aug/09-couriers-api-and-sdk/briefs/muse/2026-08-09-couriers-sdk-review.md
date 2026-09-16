# Brief — review the drafted Couriers SDK package

Review and correct the existing uncommitted Couriers SDK draft. Do not commit,
branch, push, or run commands; command execution is unavailable to you here.

## File scope

You may edit only:

- `packages/couriers/**`
- `apps/console/src/lib/couriers.ts`

Do not edit the API service, root workspace configuration, lockfile, deployment
files, or any other Console file.

## Task

Read the full original brief at
`.claude/briefs/codex/2026-08-09-couriers-sdk-package.md`,
`.claude/rules/sdk-conventions.md`, the existing implementation in
`packages/billing/`, `packages/core/src/client/`, and the Couriers API tenant
contract in `apps/couriers-api/src/modules/tenants/`.

Audit the current draft for fidelity. Correct concrete issues only. In
particular, each client tier must send just its own credential (and fail closed
without it before fetch), resources must contain no courier business behavior,
and tenant response parsing must enforce `object: 'tenant'` and return
`couriers/invalid-response` with `data: null` on malformed bodies. The public
and integration tiers offer `retrieve` and `retrieveByOrgId`; admin additionally
offers `list`. Never add `get` or `findBy` verbs. The Console singleton must be
server-only and named `$couriers`, separate from `$876`.

Add/fix tests that demonstrate the original brief's required cases. You cannot
run checks, so state that plainly in your final report and enumerate modified
files. Follow `.claude/rules/git.md`; do not commit or add AI attribution.
