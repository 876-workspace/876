# Brief — port the Couriers branches module to `apps/couriers-api`

Work on the current uncommitted tree. Do not commit, branch, push, deploy, or
run commands. You cannot execute commands here; report that plainly.

## File scope

You may edit only:

- `apps/couriers-api/prisma/schema/{schema,tenant,address,branch}.prisma`
- `apps/couriers-api/src/modules/branches/**`
- `apps/couriers-api/src/http/routes.ts`
- `apps/couriers-api/src/config/index.ts`
- `apps/couriers-api/README.md`
- `apps/couriers-api/.dev.vars.example`

Do not edit packages, the Couriers Next app, deployment files, generated Prisma
client files, lockfiles, or any other existing API module.

## Read first

- `.claude/rules/express-api.md`
- `.claude/rules/stripe-api-pattern.md`
- `apps/couriers/src/types/{branch,address}.ts`
- `apps/couriers/src/lib/service/branches/{create,list,retrieve,update,view}.ts`
- `apps/couriers/src/lib/service/addresses/{create,update}.ts`
- `apps/couriers-api/src/modules/tenants/` (the exact seven-layer pattern)
- `apps/couriers-api/src/http/routes.ts`
- `packages/core/src/platform/{index,resources/geo,types}.ts`

## Required API contract

Add a `branches` module with routes scoped by tenant ID. Use snake_case on the
wire and a literal `object: 'branch'`; nested addresses use `object: 'address'`.

| Method | Path                                 | Tier  |
| ------ | ------------------------------------ | ----- |
| GET    | `/v1/tenants/:tenantId/branches`     | admin |
| POST   | `/v1/tenants/:tenantId/branches`     | admin |
| GET    | `/v1/tenants/:tenantId/branches/:id` | admin |
| PATCH  | `/v1/tenants/:tenantId/branches/:id` | admin |

Preserve source semantics: list filters `is_active`, orders default/name/id;
first branch is default; selecting another default clears the old default;
clearing the current default is a 409; duplicate name is a 409; all branch and
address writes are atomic; a branch cannot be read or updated across tenants.

Use the platform geo catalog through `create876PlatformClient` from
`@876/core/platform`, passing the configured API URL, app key, and internal
key. Add `API_URL` as an optional config/documented variable. Resolve country
and region outside write transactions exactly as the source does. Failed
platform catalog calls are a safe 503 `address/geography-unavailable`; unknown
country/region and missing required regions have stable `address/*` codes.
Never trust a client-supplied region display name.

## Prisma scope

This service introspects/maps the existing Couriers database and creates no
migrations. Add minimal mapped `Address` and `Branch` projections and their
relations to `Tenant`; omit unrelated relation fields, but preserve database
table/column names, unique constraints, and the composite Branch→Address
relation. Do not modify generated Prisma client files.

## Layer rules and tests

Create the complete seven-layer module plus `index.ts`: routes, controller,
service, repository, schemas, serializers, docs, tests. Prisma only in the
repository. Zod owns input, output, and OpenAPI schemas. Tests must mock the
Prisma client and platform geo client; cover full success envelopes, invalid
input (422 exact code), authorization failure (401 exact code), cross-tenant
404, default-branch invariants, and an OpenAPI snapshot update.

Follow `.claude/rules/git.md`: no commit and no AI attribution. Report all
files you modified and state that no commands were run.
