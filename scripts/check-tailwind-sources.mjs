#!/usr/bin/env node
/**
 * Every Next app that transpiles a shared product-UI package must declare
 * a matching `@source` glob in `apps/<app>/src/app/globals.css`, so Tailwind v4
 * compiles all utility classes used inside that shared package.
 *
 * Missing `@source` globs do not fail build time; they silently fail to
 * generate utility classes, leaving components unstyled at runtime.
 * That is what this check exists to prevent.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  SHARED_PRODUCT_UI_PACKAGES,
  tailwindSourceGlobForPackage,
} from './shared-ui-packages.mjs'

const APPS_ROOT = 'apps'

/**
 * Check a single app's globals.css for required @source globs.
 * Returns array of violation strings.
 */
export function checkAppTailwindSources({
  appName,
  nextConfigSource,
  packageJson,
  globalsCssSource,
  sharedPackages = SHARED_PRODUCT_UI_PACKAGES,
}) {
  const violations = []

  // If next.config doesn't use transpilePackages, it's not a Next app with transpilation
  if (nextConfigSource && !/transpilePackages/.test(nextConfigSource)) {
    return violations
  }

  const allDeps = {
    ...(packageJson?.dependencies || {}),
    ...(packageJson?.devDependencies || {}),
  }

  // Which shared product-UI packages does this app depend on?
  const transpiledShared = sharedPackages.filter((pkg) => pkg in allDeps)

  if (transpiledShared.length === 0) {
    return violations
  }

  if (!globalsCssSource) {
    violations.push(
      `${appName}: missing src/app/globals.css but transpiles ${transpiledShared.join(', ')}`
    )
    return violations
  }

  for (const pkg of transpiledShared) {
    const shortName = pkg.replace(/^@876\//, '')
    // Match @source line targeting this package's src directory
    const sourcePattern = new RegExp(
      `@source\\s+['"][^'"]*packages/${shortName}/src/[^'"]*['"]`
    )
    if (!sourcePattern.test(globalsCssSource)) {
      const expected = tailwindSourceGlobForPackage(pkg)
      violations.push(
        `${appName}: missing @source for ${pkg}. Add \`@source '${expected}';\` to globals.css`
      )
    }
  }

  return violations
}

/**
 * Scan all apps in `appsRoot` and verify their globals.css @source lines.
 */
export function checkAllAppsTailwindSources(appsRoot = APPS_ROOT) {
  const violations = []
  for (const app of readdirSync(appsRoot, { withFileTypes: true })) {
    if (!app.isDirectory()) continue
    const configPath = join(appsRoot, app.name, 'next.config.ts')
    const pkgPath = join(appsRoot, app.name, 'package.json')
    const cssPath = join(appsRoot, app.name, 'src', 'app', 'globals.css')

    if (!existsSync(configPath) || !existsSync(pkgPath)) continue

    const nextConfigSource = readFileSync(configPath, 'utf8')
    if (!/transpilePackages/.test(nextConfigSource)) continue

    const packageJson = JSON.parse(readFileSync(pkgPath, 'utf8'))
    const globalsCssSource = existsSync(cssPath)
      ? readFileSync(cssPath, 'utf8')
      : ''

    const appViolations = checkAppTailwindSources({
      appName: `apps/${app.name}`,
      nextConfigSource,
      packageJson,
      globalsCssSource,
    })
    violations.push(...appViolations)
  }
  return violations
}

// Execute directly if run as a script
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const violations = checkAllAppsTailwindSources()

  if (violations.length > 0) {
    console.error(`check-tailwind-sources: ${violations.length} violation(s)\n`)
    for (const violation of violations) console.error(`  - ${violation}`)
    console.error('\nSee scripts/shared-ui-packages.mjs')
    process.exit(1)
  }

  console.log('check-tailwind-sources: OK')
}
