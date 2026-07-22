import { readFile, readdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'

const BillingRoot = path.resolve(import.meta.dirname, '..')
const ApiRoot = path.join(BillingRoot, 'src/app/api')
const ContractRoot = path.join(BillingRoot, 'contracts/v1')
const RouteManifestPath = path.join(ContractRoot, 'route-manifest.json')
const OpenApiPath = path.join(ContractRoot, 'openapi.json')
const HttpMethods = ['DELETE', 'GET', 'PATCH', 'POST', 'PUT'] as const

type HttpMethod = (typeof HttpMethods)[number]
type AuthTier = 'admin' | 'integration' | 'tenant'

interface RouteOperation {
  auth_tier: AuthTier
  declared_permissions: string[]
  declared_scopes: string[]
  declared_statuses: number[]
  method: HttpMethod
}

interface RouteManifestEntry {
  operations: RouteOperation[]
  path: string
  source: string
}

async function routeFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true })
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = path.join(directory, entry.name)
      if (entry.isDirectory()) return routeFiles(entryPath)
      return entry.name === 'route.ts' ? [entryPath] : []
    })
  )

  return nested.flat().sort()
}

function versionedRoute(filePath: string): {
  authTier: AuthTier
  routePath: string
} | null {
  const relativePath = path.relative(ApiRoot, filePath).replaceAll('\\', '/')
  const routePath = relativePath.replace(/\/route\.ts$/, '')

  let authTier: AuthTier
  let canonicalPath: string
  if (routePath.startsWith('admin/')) {
    authTier = 'admin'
    canonicalPath = `/${routePath}`
  } else if (routePath.startsWith('billing/integrations/')) {
    authTier = 'integration'
    canonicalPath = `/${routePath.slice('billing/'.length)}`
  } else if (routePath.startsWith('billing/')) {
    authTier = 'tenant'
    canonicalPath = `/${routePath.slice('billing/'.length)}`
  } else {
    return null
  }

  return {
    authTier,
    routePath: canonicalPath.replace(/\[([^\]]+)\]/g, '{$1}'),
  }
}

function matches(source: string, pattern: RegExp): string[] {
  return [...source.matchAll(pattern)].map((match) => match[1]).sort()
}

function unique<T>(values: T[]): T[] {
  return [...new Set(values)]
}

function methods(source: string): HttpMethod[] {
  return HttpMethods.filter((method) =>
    new RegExp(`export\\s+(?:async\\s+function|const)\\s+${method}\\b`).test(
      source
    )
  )
}

function operationSource(source: string, method: HttpMethod): string {
  const declaration = new RegExp(
    `export\\s+(?:async\\s+function|const)\\s+${method}\\b`
  )
  const start = source.search(declaration)
  if (start === -1) return ''

  const remainingSource = source.slice(start + 1)
  const nextOperation = remainingSource.search(
    /export\s+(?:async\s+function|const)\s+(?:DELETE|GET|PATCH|POST|PUT)\b/
  )

  return nextOperation === -1
    ? source.slice(start)
    : source.slice(start, start + 1 + nextOperation)
}

async function createRouteManifest(): Promise<{
  generated_from: string
  routes: RouteManifestEntry[]
  version: 1
}> {
  const files = await routeFiles(ApiRoot)
  const routes = await Promise.all(
    files.map(async (filePath): Promise<RouteManifestEntry | null> => {
      const route = versionedRoute(filePath)
      if (!route) return null

      const source = await readFile(filePath, 'utf8')
      return {
        operations: methods(source).map((method) => {
          const handler = operationSource(source, method)

          return {
            auth_tier: route.authTier,
            declared_permissions: unique(
              matches(handler, /requirePermission\(\s*['"]([^'"]+)['"]/g)
            ),
            declared_scopes: unique(
              matches(
                handler,
                /requireIntegrationOrganization\([\s\S]*?['"](billing\.[^'"]+)['"]\s*\)/g
              )
            ),
            declared_statuses: unique(
              matches(handler, /status\s*:\s*(\d{3})/g).map(Number)
            ).sort((left, right) => left - right),
            method,
          }
        }),
        path: route.routePath,
        source: path.relative(BillingRoot, filePath).replaceAll('\\', '/'),
      }
    })
  )

  return {
    generated_from: 'src/app/api/{admin,billing}/**/route.ts',
    routes: routes.filter((route) => route !== null),
    version: 1,
  }
}

function serialized(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`
}

async function checkFile(filePath: string, expected: string): Promise<void> {
  const actual = await readFile(filePath, 'utf8').catch(() => '')
  if (actual !== expected) {
    const relativePath = path.relative(BillingRoot, filePath)
    throw new Error(
      `${relativePath} is stale. Run pnpm --filter @876/billing-app contract:generate.`
    )
  }
}

async function main(): Promise<void> {
  const mode = process.argv[2]
  if (mode !== '--check' && mode !== '--write')
    throw new Error('Pass either --check or --write.')

  process.env.BILLING_OAUTH_ISSUER = 'http://localhost:4000'
  const { OpenApiDocument } = await import('../src/lib/api/openapi')
  const routeManifest = serialized(await createRouteManifest())
  const openApi = serialized(OpenApiDocument)

  if (mode === '--write') {
    await writeFile(RouteManifestPath, routeManifest)
    await writeFile(OpenApiPath, openApi)
    return
  }

  await Promise.all([
    checkFile(RouteManifestPath, routeManifest),
    checkFile(OpenApiPath, openApi),
  ])
}

await main()
