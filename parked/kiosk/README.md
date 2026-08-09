# Parked: counter kiosk

Nothing in this directory is built, bundled, imported, or deployed. `parked/` is
outside the pnpm workspace globs (`apps/*`, `packages/*`), so no install, no
`turbo` task, and no Next.js route ever reaches it.

It is kept because the code was written and reviewed, not because it is wanted
yet. The kiosk is a counter surface — a customer types a mailbox number, staff
hand over waiting packages — and it will end up looking like the customer
portal. There is no use for it today.

## What is here

| Path                                                              | Was                                                                |
| ----------------------------------------------------------------- | ------------------------------------------------------------------ |
| `couriers-api/module/`                                            | `apps/couriers-api/src/modules/kiosk/`                             |
| `couriers-api/kiosk-device.prisma`                                | `apps/couriers-api/prisma/schema/kiosk-device.prisma`              |
| `couriers-app/route/`                                             | `apps/couriers/src/app/kiosk/`                                     |
| `couriers-app/kiosk-device.prisma`                                | `apps/couriers/prisma/schema/kiosk-device.prisma`                  |
| `couriers-app/migration_20260809000000_kiosk_device_credentials/` | an unapplied couriers migration                                    |
| `sdk/kiosk/`                                                      | `packages/couriers/src/kiosk/` (the `@876/couriers/kiosk` subpath) |

## What was unwired when it was parked

- `apps/couriers-api/src/http/routes.ts` — the kiosk router registration and the
  `kioskDevice` branch of the guard resolver
- `apps/couriers-api/src/http/api-router.ts` — the `kioskDevice` member of
  `Security` and its OpenAPI security requirement
- `apps/couriers-api/src/http/openapi/registry.ts` — the
  `KioskDeviceCredential` security scheme
- `packages/couriers/package.json` — the `./kiosk` export
- `PackagePickupChallenge` and the `kioskDevices` relations, removed from both
  couriers Prisma schemas (the migration above was never applied, so no database
  carries these tables)

## Reinstating it

Move each directory back, restore the six wiring points above, re-run
`prisma generate` in both apps, and update the OpenAPI snapshot. The open design
questions from the extraction plan still stand: device enrollment and
revocation, what happens when a device is stolen, whether a mailbox number alone
should authorize _displaying_ package details (it probably should not), and how
a collection is attributed to a staff member.
