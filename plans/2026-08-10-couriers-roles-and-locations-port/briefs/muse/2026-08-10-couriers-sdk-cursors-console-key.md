# Couriers SDK cursors and Console credential correction

Implement precisely two isolated review findings:

1. In `packages/couriers`, add `starting_after` and `ending_before` to the
   admin customer, package, and mailbox list parameter contracts; ensure the
   resource methods serialize them into query strings and extend focused tests.
2. In `apps/console`, remove the invalid `API_876_KEY` fallback for the
   Couriers client. Require `COURIERS_API_KEY` and document it in the Console
   `.env.example`.

Read repository rules first. Do not touch API modules, Prisma, app Couriers
call sites, kiosk, portal, organization locations, docs/status, or unrelated
working-tree files. Do not commit/push. You cannot run commands here; report
the exact files changed so the orchestrator can verify them.
