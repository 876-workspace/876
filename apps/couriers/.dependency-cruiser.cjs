/**
 * Module-boundary enforcement for @876/couriers.
 *
 * Couriers today is a Next.js app with an in-process datastore, but its data
 * access is deliberately shaped like a service that has not been extracted yet:
 * `service.<resource>.<verb>()` over Prisma, `ServiceResult` envelopes, no
 * business logic in route handlers. These rules are what keep that shape true.
 *
 * Without them the boundary erodes silently — one page imports `prisma`
 * directly because the service verb it needed did not exist yet, and the day we
 * stand up `apps/couriers-api` that import is a rewrite instead of a move. A
 * convention nobody can violate by accident is worth more than a convention
 * everybody agrees with. See `.claude/rules/sdk-conventions.md` (app-local
 * datastore layering) and `.claude/rules/express-api.md`.
 */
module.exports = {
  forbidden: [
    {
      name: 'prisma-only-in-service',
      comment:
        'Only src/lib/service/** may import the Prisma client. A page, route handler, or ' +
        'component that queries directly puts table access outside the layer that owns it, ' +
        'and is the one thing that makes extracting couriers-api a rewrite rather than a move.',
      severity: 'error',
      from: { pathNot: '^src/lib/(service|db)/' },
      to: { path: '^src/lib/db(/index\\.ts)?$' },
    },
    {
      name: 'no-generated-prisma-outside-db',
      comment:
        'Import model types from @/lib/db, never from the generated client directly.',
      severity: 'error',
      from: { pathNot: '^src/lib/db/' },
      to: { path: 'generated/prisma' },
    },
    {
      name: 'service-owns-no-platform-calls',
      comment:
        'src/lib/service/** is pure datastore access. Platform/Billing/Storage calls belong ' +
        'in an orchestration module (src/lib/manage/, src/lib/portal/) that composes the two, ' +
        'so the service layer can move into a standalone API service unchanged.',
      severity: 'error',
      // KNOWN EXCEPTION — src/lib/service/org-locations/sync.ts mirrors a committed
      // branch/warehouse into the core location registry, and is called from inside
      // branches.create/update. It is orchestration living in the service layer, and
      // it is the one thing that would not move cleanly into couriers-api today.
      // Fixing it means the *caller* schedules the mirror after the verb returns;
      // until then it is listed here so the debt is visible rather than silently
      // permitted by a weaker rule. See Phase 2 in the couriers extraction plan.
      from: { path: '^src/lib/service/', pathNot: '^src/lib/service/org-locations/' },
      to: { path: '^src/lib/(876|finance)/' },
    },
    {
      name: 'service-is-framework-free',
      comment:
        'src/lib/service/** must not import Next.js. A service verb that reads headers() or ' +
        'cookies() cannot run anywhere except inside a Next request, which defeats extraction.',
      severity: 'error',
      // Same exception, same reason as above.
      from: { path: '^src/lib/service/', pathNot: '^src/lib/service/org-locations/' },
      to: { path: '^(next|next/.+)$', dependencyTypes: ['npm'] },
    },
    {
      name: 'no-service-imports-from-app',
      comment:
        'Dependencies point inward: app/ may import service/, never the reverse.',
      severity: 'error',
      from: { path: '^src/lib/' },
      to: { path: '^src/app/' },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    exclude: { path: '(\\.test\\.tsx?$|/generated/)' },
    tsConfig: { fileName: 'tsconfig.json' },
    // Type-only imports are erased at build time and carry no coupling: a module
    // that does `import type { Tenant } from '@/lib/db'` holds a Prisma *shape*,
    // not a database connection, and moving the service layer into its own API
    // does not have to touch it. Counting them would flag every typed function
    // signature in the app and make the boundary rules noise instead of a gate.
    tsPreCompilationDeps: false,
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default', 'types'],
      extensions: ['.js', '.jsx', '.ts', '.tsx'],
    },
  },
}
