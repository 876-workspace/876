import assert from 'node:assert/strict'
import test from 'node:test'

import {
  checkAppTailwindSources,
  checkAllAppsTailwindSources,
} from './check-tailwind-sources.mjs'

test('a matching app passes', () => {
  const violations = checkAppTailwindSources({
    appName: 'apps/projects',
    nextConfigSource: `
      import { sharedTranspilePackages } from '../../scripts/shared-ui-packages.mjs'
      export default { transpilePackages: sharedTranspilePackages(['@876/core']) }
    `,
    packageJson: {
      dependencies: {
        '@876/projects-ui': 'workspace:*',
        '@876/core': 'workspace:*',
      },
    },
    globalsCssSource: `
      @import '@876/ui/styles.css';
      @source '../';
      @source '../../../../packages/projects-ui/src/**/*.{ts,tsx}';
    `,
  })

  assert.equal(violations.length, 0, 'Matching app should have 0 violations')
})

test('an app missing one glob fails and names the package and the app', () => {
  const violations = checkAppTailwindSources({
    appName: 'apps/projects',
    nextConfigSource: `
      import { sharedTranspilePackages } from '../../scripts/shared-ui-packages.mjs'
      export default { transpilePackages: sharedTranspilePackages() }
    `,
    packageJson: {
      dependencies: {
        '@876/projects-ui': 'workspace:*',
      },
    },
    globalsCssSource: `
      @import '@876/ui/styles.css';
      @source '../';
    `,
  })

  assert.equal(violations.length, 1, 'Expected exactly 1 violation')
  assert.match(
    violations[0],
    /apps\/projects/,
    'Violation must name the failing app'
  )
  assert.match(
    violations[0],
    /@876\/projects-ui/,
    'Violation must name the missing package'
  )
})

test('an app with an extra unrelated glob still passes', () => {
  const violations = checkAppTailwindSources({
    appName: 'apps/billing',
    nextConfigSource: `
      import { sharedTranspilePackages } from '../../scripts/shared-ui-packages.mjs'
      export default { transpilePackages: sharedTranspilePackages(['@876/widgets']) }
    `,
    packageJson: {
      dependencies: {
        '@876/billing-ui': 'workspace:*',
        '@876/widgets': 'workspace:*',
      },
    },
    globalsCssSource: `
      @import '@876/ui/styles.css';
      @source '../';
      @source '../../../../packages/billing-ui/src/**/*.{ts,tsx}';
      /* Extra unrelated glob for widgets */
      @source '../../../../packages/widgets/src/**/*.{ts,tsx}';
    `,
  })

  assert.equal(
    violations.length,
    0,
    'App with extra unrelated globs should still pass'
  )
})

test('an app that transpiles nothing shared passes', () => {
  const violations = checkAppTailwindSources({
    appName: 'apps/876',
    nextConfigSource: `
      import { sharedTranspilePackages } from '../../scripts/shared-ui-packages.mjs'
      export default { transpilePackages: sharedTranspilePackages(['@876/core']) }
    `,
    packageJson: {
      dependencies: {
        '@876/core': 'workspace:*',
        '@876/analytics': 'workspace:*',
        '@876/ui': 'workspace:*',
      },
    },
    globalsCssSource: `
      @import '@876/ui/styles.css';
      @source '../';
    `,
  })

  assert.equal(
    violations.length,
    0,
    'App that transpiles nothing shared should pass'
  )
})

test('an app missing multiple shared UI globs reports each missing package and the app', () => {
  const violations = checkAppTailwindSources({
    appName: 'apps/crm',
    nextConfigSource: `
      import { sharedTranspilePackages } from '../../scripts/shared-ui-packages.mjs'
      export default { transpilePackages: sharedTranspilePackages() }
    `,
    packageJson: {
      dependencies: {
        '@876/crm-ui': 'workspace:*',
        '@876/access-ui': 'workspace:*',
      },
    },
    globalsCssSource: `
      @import '@876/ui/styles.css';
      @source '../';
    `,
  })

  assert.equal(violations.length, 2, 'Expected 2 violations')
  assert.ok(violations.every((v) => v.includes('apps/crm')))
  assert.ok(violations.some((v) => v.includes('@876/crm-ui')))
  assert.ok(violations.some((v) => v.includes('@876/access-ui')))
})

test('non-transpiled apps or apps without next.config are skipped', () => {
  const violations = checkAppTailwindSources({
    appName: 'apps/api',
    nextConfigSource: `export default {}`,
    packageJson: {
      dependencies: {
        '@876/projects-ui': 'workspace:*',
      },
    },
    globalsCssSource: '',
  })

  assert.equal(violations.length, 0)
})
