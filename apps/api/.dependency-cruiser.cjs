/**
 * Module-boundary enforcement for @876/api.
 *
 * These rules are the difference between a modular monolith and a normal
 * monolith with hopeful folder names. Without them, "only import a module
 * through its index" survives about six weeks — someone debugging at midnight
 * imports three folders deep, the tired reviewer approves it, and the contract
 * is gone. See .claude/rules/express-api.md.
 */
module.exports = {
  forbidden: [
    {
      name: 'module-boundary',
      comment:
        "A module may only be reached through its index.ts. Reaching into another module's " +
        'internals makes ownership unknowable and defeats any later extraction.',
      severity: 'error',
      from: { path: '^src/modules/([^/]+)/' },
      to: {
        path: '^src/modules/([^/]+)/.+',
        pathNot: [
          // Same module: any internal import is fine.
          '^src/modules/$1/',
          // Other modules: only the public entry point.
          '^src/modules/[^/]+/index\\.ts$',
        ],
      },
    },
    {
      name: 'prisma-only-in-repositories',
      comment:
        'Only a *.repository.ts file may import the Prisma client. A service or controller ' +
        "that queries directly puts a module's table access outside the file that owns it.",
      severity: 'error',
      // Two composition roots own a connection lifecycle and call
      // disconnectDb() on shutdown without ever issuing a query: the HTTP
      // server, and the seed CLI, which must close the pool or the process
      // never exits.
      from: {
        pathNot:
          '(\\.repository\\.ts$|^src/db/|^src/server\\.ts$|^src/seeds/cli\\.ts$)',
      },
      to: { path: '^src/db/client\\.ts$' },
    },
    {
      name: 'no-generated-prisma-outside-db',
      comment:
        'Import model types from src/db, never from the generated client directly.',
      severity: 'error',
      from: { pathNot: '^src/db/' },
      to: { path: 'generated/prisma' },
    },
    {
      name: 'platform-is-leaf',
      comment:
        'platform/ holds cross-module primitives; it must not depend on a module.',
      severity: 'error',
      from: { path: '^src/platform/' },
      to: { path: '^src/(modules|http|workers)/' },
    },
    {
      name: 'providers-are-leaf',
      comment:
        'A provider adapter wraps one external vendor. Knowing about a module inverts the ' +
        'dependency and makes the adapter untestable in isolation.',
      severity: 'error',
      from: { path: '^src/providers/' },
      to: { path: '^src/(modules|http|workers)/' },
    },
    {
      name: 'http-core-is-module-agnostic',
      comment:
        'http/ owns framework cross-cutting concerns. A middleware that imports a module ' +
        'has business logic in it.',
      severity: 'error',
      from: { path: '^src/http/', pathNot: '^src/http/routes\\.ts$' },
      to: { path: '^src/modules/' },
    },
    {
      name: 'no-importing-the-composition-root',
      comment:
        'Nothing imports app.ts or server.ts except the test harness and the entry point.',
      severity: 'error',
      from: {
        pathNot: '(^src/(server|app)\\.ts$|\\.(test|spec)\\.ts$|^src/test/)',
      },
      to: { path: '^src/(app|server)\\.ts$' },
    },
    {
      name: 'no-circular',
      comment:
        'Circular dependencies make initialization order load-bearing and untestable.',
      severity: 'error',
      from: {},
      to: { circular: true },
    },
    {
      name: 'no-orphans',
      comment: 'Unreachable module — delete it or wire it up.',
      severity: 'warn',
      from: {
        orphan: true,
        pathNot: [
          '\\.d\\.ts$',
          '^src/test/',
          '(^|/)(vitest|prisma)\\.config\\.ts$',
        ],
      },
      to: {},
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    exclude: { path: '(node_modules|generated/prisma|dist)' },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: 'tsconfig.json' },
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default', 'types'],
      extensions: ['.ts', '.js', '.json'],
    },
    reporterOptions: {
      text: { highlightFocused: true },
    },
  },
}
