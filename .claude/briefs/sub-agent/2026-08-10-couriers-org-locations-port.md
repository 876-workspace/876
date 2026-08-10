# Couriers organization-location port

Port only `apps/couriers/src/lib/manage/org-locations.ts` off the deprecated
app-local Couriers service. Add the narrow API/SDK capability required for
site reconciliation, migrate callers, and add focused tests. Do not touch
customer lifecycle, portal, kiosk, Prisma schemas, tracker/status docs, or
unrelated working-tree changes. Do not commit or push. Verify only the
affected API/SDK/app checks in the foreground and report their results.
