# Brief — document the Couriers API Cloudflare deployment

Work only on `docs/cloudflare.md`. Do not modify any application, package,
workflow, configuration, lockfile, or brief file. Do not commit, push, deploy,
or invoke Wrangler.

## Task

The uncommitted Couriers API deployment wiring introduces a third Express
container service. Read `docs/cloudflare.md` in full and compare its existing
tables and environment-variable sections to `apps/api`, `apps/billing-api`, and
the Couriers API configuration in `apps/couriers-api/src/config/` and
`apps/couriers-api/wrangler.jsonc`.

Ensure the document records `876-couriers-api` / `@876/couriers-api` /
`apps/couriers-api` as a Container in the correct worker/container table
position and accurately lists only the Couriers API environment variables. Keep
the existing house style, ordering, and wording. Do not describe or add
credentials, values, bindings, or deployment steps that are not established by
the reference services.

Report the exact documentation changes; state whether you ran any command. Do
not commit or add AI attribution.
