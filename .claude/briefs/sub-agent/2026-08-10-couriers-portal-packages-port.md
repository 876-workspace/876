# Couriers portal package reader port

Port only the existing portal package list/detail readers and
`apps/couriers/src/app/api/portal/packages/route.ts` from `@/lib/service` to
the existing session-scoped `@876/couriers` client resources. Preserve
tenant/session ownership and current view models. Do not modify Couriers API,
SDK package sources, Prisma, kiosk, tenant resolution, enrollment/customer
lifecycle, or status docs. If existing session resources lack a field, report
the exact gap rather than broadening the scope. Do not commit/push; run only
focused app checks in the foreground.
