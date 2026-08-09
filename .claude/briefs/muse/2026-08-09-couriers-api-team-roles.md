# Couriers API: team and roles port (draft only)

Implement a self-contained draft in `apps/couriers-api` for tenant-scoped Roles
and TeamMember grants. Do not commit. Do not change the existing modules or any
shared config unless the new router must be registered in `src/http/routes.ts`.

Mirror existing semantics in `apps/couriers/src/lib/service/{roles,team}`:

- custom roles only are editable/deletable; `admin` and `staff` system roles are
  immutable;
- reject invalid permission keys based on the Couriers permission catalog;
- role deletion rejects roles with members;
- team assignment must use a role from the same tenant;
- do not remove or demote the last active admin.

Use the Couriers API module shape (schemas, serializers, repository, service,
controller, docs, routes, `index.ts`), snake_case JSON, `{ data, error }`
envelopes, `object` discriminators, admin guards, and OpenAPI contracts. Add
focused Supertest coverage. Do not use `any`, do not access `process.env` outside
config, and do not add code to the Next app.

The primary agent will review every file and run the checks; no report is proof.
