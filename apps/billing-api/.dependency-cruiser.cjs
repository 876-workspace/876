module.exports = {
  forbidden: [
    {
      name: 'module-boundary',
      severity: 'error',
      from: { path: '^src/modules/([^/]+)/' },
      to: {
        path: '^src/modules/([^/]+)/.+',
        pathNot: ['^src/modules/$1/', '^src/modules/[^/]+/index\\.ts$'],
      },
    },
    {
      name: 'inventory-does-not-depend-on-documents',
      severity: 'error',
      from: { path: '^src/modules/inventory/' },
      to: { path: '^src/modules/documents/' },
    },
    {
      name: 'catalog-does-not-depend-on-documents',
      severity: 'error',
      from: { path: '^src/modules/catalog/' },
      to: { path: '^src/modules/documents/' },
    },
    {
      name: 'pricing-does-not-depend-on-documents',
      severity: 'error',
      from: { path: '^src/modules/pricing/' },
      to: { path: '^src/modules/documents/' },
    },
    {
      name: 'document-workflows-use-public-module-apis',
      severity: 'error',
      from: { path: '^src/modules/documents/workflows/' },
      to: {
        path: '^src/modules/(?!documents/)[^/]+/(?:repositories?/|[^/]+\\.repository\\.ts$)',
      },
    },
    {
      name: 'prisma-only-in-repositories',
      severity: 'error',
      from: { pathNot: '(\\.repository\\.ts$|/repositories/|^src/db/)' },
      to: { path: '^src/db/client\\.ts$' },
    },
    {
      name: 'no-generated-prisma-outside-db',
      severity: 'error',
      from: { pathNot: '^src/db/' },
      to: { path: 'generated/prisma' },
    },
    {
      name: 'platform-is-leaf',
      severity: 'error',
      from: { path: '^src/platform/' },
      to: { path: '^src/(modules|http|workers)/' },
    },
    {
      name: 'providers-are-leaf',
      severity: 'error',
      from: { path: '^src/providers/' },
      to: { path: '^src/(modules|http|workers)/' },
    },
    {
      name: 'http-core-is-module-agnostic',
      severity: 'error',
      from: { path: '^src/http/', pathNot: '^src/http/routes\\.ts$' },
      to: { path: '^src/modules/' },
    },
    {
      name: 'no-importing-composition-root',
      severity: 'error',
      from: {
        pathNot: '(^src/(server|app)\\.ts$|\\.(test|spec)\\.ts$|^src/test/)',
      },
      to: { path: '^src/(app|server)\\.ts$' },
    },
    {
      name: 'no-circular',
      severity: 'error',
      from: {},
      to: { circular: true },
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
  },
}
