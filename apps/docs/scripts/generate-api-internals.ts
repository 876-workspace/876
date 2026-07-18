import { access, rm, mkdir, readFile, writeFile } from 'node:fs/promises'
import { basename, dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

type HttpMethod = 'get' | 'post' | 'patch' | 'delete'

type ErrorInfo = {
  code: string
  message: string
  status: string
  source: string
}

type ClientCaller = {
  package: string
  method: string
  httpMethod?: HttpMethod
  path: string
  sourceFile: string
  sourceLine: number
}

type AppCaller = {
  app: string
  file: string
  symbol: string
}

type SourceExcerpt = {
  title: string
  file: string
  line: number
  language: 'python' | 'typescript'
  code: string
}

type RouteInfo = {
  id: string
  title: string
  domain: string
  method: HttpMethod
  path: string
  sourceFile: string
  sourceLine: number
  functionName: string
  statusCode: string
  responseModel: string | null
  requestModel: string | null
  auth: string
  dependencies: string[]
  schemas: string[]
  repositories: string[]
  services: string[]
  helpers: string[]
  errors: ErrorInfo[]
  clientCallers: ClientCaller[]
  appCallers: AppCaller[]
  tests: string[]
  summary: string
  description: string
  sourceExcerpts: SourceExcerpt[]
  sdkExample: string | null
  httpExample: string
}

type ApiInventory = {
  generatedAt: string
  routes: RouteInfo[]
  clientCallers: ClientCaller[]
  appCallers: AppCaller[]
}

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(__dirname, '../../..')
const apiRoot = join(repoRoot, 'apps/api')
const docsRoot = join(repoRoot, 'apps/docs')
const generatedDir = join(docsRoot, 'src/generated')
const contentRoot = join(docsRoot, 'content/docs')

const domainOrder = [
  'health',
  'auth',
  'oauth',
  'apps',
  'users',
  'organizations',
  'memberships',
  'features',
  'addresses',
  'audit_events',
  'geo',
]

const domainLabels: Record<string, string> = {
  health: 'Health',
  auth: 'Auth',
  oauth: 'OAuth Provider',
  apps: 'Apps',
  users: 'Users',
  organizations: 'Organizations',
  memberships: 'Memberships',
  features: 'Features',
  addresses: 'Addresses',
  audit_events: 'Audit Events',
  geo: 'Geo',
}

const protectedPrefixes: Record<string, string> = {
  auth: '/auth',
}

const publicDomains = new Set(['health', 'oauth', 'geo'])
const routeFilePattern = /apps\/api\/domains\/([^/]+)\/router\.py$/

async function main() {
  const routeFiles = await findRouterFiles()
  const clientCallers = await extractClientCallers()
  const appCallers = await extractAppCallers()
  const tests = await findTests()
  const routes = (
    await Promise.all(
      routeFiles.map((file) =>
        extractRoutes(file, clientCallers, appCallers, tests)
      )
    )
  )
    .flat()
    .sort((a, b) => {
      const domainDelta =
        domainOrder.indexOf(a.domain) - domainOrder.indexOf(b.domain)
      if (domainDelta !== 0) return domainDelta

      return a.path.localeCompare(b.path) || a.method.localeCompare(b.method)
    })

  const inventory: ApiInventory = {
    generatedAt: new Date().toISOString(),
    routes,
    clientCallers,
    appCallers,
  }

  await mkdir(generatedDir, { recursive: true })
  await writeFile(
    join(generatedDir, 'api-inventory.json'),
    `${JSON.stringify(inventory, null, 2)}\n`,
    'utf8'
  )
  await writeRoutePages(routes)
}

async function findRouterFiles() {
  const entries = await readdirRecursive(join(apiRoot, 'domains'))

  return entries
    .filter((file) => file.endsWith('/router.py'))
    .sort((a, b) => a.localeCompare(b))
}

async function readdirRecursive(root: string): Promise<string[]> {
  const { readdir } = await import('node:fs/promises')
  const entries = await readdir(root, { withFileTypes: true })
  const results = await Promise.all(
    entries.map(async (entry) => {
      const path = join(root, entry.name)
      if (entry.isDirectory()) return readdirRecursive(path)

      return [path]
    })
  )

  return results.flat()
}

async function extractRoutes(
  file: string,
  clientCallers: ClientCaller[],
  appCallers: AppCaller[],
  tests: string[]
): Promise<RouteInfo[]> {
  const text = await readFile(file, 'utf8')
  const relativeFile = toRepoPath(file)
  const domain = relativeFile.match(routeFilePattern)?.[1] ?? basename(file)
  const basePrefix =
    extractRouterPrefix(text) ?? protectedPrefixes[domain] ?? ''
  const routeBlocks = splitRouteBlocks(text)
  const docs = await loadDocsConstants(domain)
  const helperDefinitions = extractPythonDefinitions(text, relativeFile)
  const schemaDefinitions = await loadSchemaDefinitions(domain)

  return routeBlocks.map((block) => {
    const method = block.decorator.method
    const routePath =
      block.decorator.path === '""' ? '' : unquote(block.decorator.path)
    const fullPath = normalizePath(`${basePrefix}${routePath}`)
    const functionName = block.functionName
    const statusCode =
      extractDecoratorValue(block.decorator.body, 'status_code')?.replace(
        /^status\./,
        ''
      ) ?? 'HTTP_200_OK'
    const responseModel =
      extractDecoratorValue(block.decorator.body, 'response_model') ?? null
    const summaryRef = extractDecoratorValue(block.decorator.body, 'summary')
    const descriptionRef = extractDecoratorValue(
      block.decorator.body,
      'description'
    )
    const summary =
      resolveDocConstant(summaryRef, docs) ?? titleFromFunction(functionName)
    const description =
      resolveDocConstant(descriptionRef, docs) ??
      `Internal route implementation for ${method.toUpperCase()} ${fullPath}.`
    const dependencies = extractDependencies(block.signature)
    const requestModel = extractRequestModel(block.signature)
    const schemas = unique([
      requestModel,
      responseModel,
      ...extractImportedSchemas(text, block.text),
    ])
    const helpers = extractHelperCalls(block.text)
    const matchingClientCallers = clientCallers.filter(
      (caller) =>
        pathsCompatible(caller.path, fullPath) &&
        (!caller.httpMethod || caller.httpMethod === method)
    )
    const matchingAppCallers = matchAppCallers(
      matchingClientCallers,
      appCallers
    )

    const sourceExcerpts = uniqueExcerpts([
      {
        title: `Route: ${functionName}()`,
        file: relativeFile,
        line: lineNumberFor(text, block.offset),
        language: 'python' as const,
        code: trimCode(block.text),
      },
      ...helpers
        .map((helper) => helperDefinitions.get(helper))
        .filter(Boolean)
        .map((excerpt) => excerpt as SourceExcerpt),
      ...schemas
        .map((schema) => schemaDefinitions.get(schema))
        .filter(Boolean)
        .map((excerpt) => excerpt as SourceExcerpt),
      ...matchingClientCallers.map((caller) => ({
        title: `${caller.package} ${caller.method}`,
        file: caller.sourceFile,
        line: caller.sourceLine,
        language: 'typescript' as const,
        code: buildSdkExample(caller, method, fullPath),
      })),
    ])

    return {
      id: routeId(method, fullPath),
      title: titleFromSummary(summary, functionName),
      domain,
      method,
      path: fullPath,
      sourceFile: relativeFile,
      sourceLine: lineNumberFor(text, block.offset),
      functionName,
      statusCode,
      responseModel,
      requestModel,
      auth: resolveAuth(domain, block.signature),
      dependencies,
      schemas,
      repositories: extractNames(
        block.text,
        /([A-Z][A-Za-z0-9]+Repository)\(/g
      ),
      services: extractNames(block.text, /\b(service|AuthServiceDep)\b/g),
      helpers,
      errors: extractErrors(block.text, functionName),
      clientCallers: matchingClientCallers,
      appCallers: matchingAppCallers,
      tests: tests.filter((test) => test.includes(`/test_${domain}`)),
      summary,
      description: normalizeMarkdown(description),
      sourceExcerpts,
      sdkExample: buildBestSdkExample(matchingClientCallers, method, fullPath),
      httpExample: buildHttpExample(method, fullPath, requestModel),
    }
  })
}

function splitRouteBlocks(text: string) {
  const regex =
    /@(router|public_router)\.(get|post|patch|delete)\(\s*("[^"]*"|'[^']*')([\s\S]*?)\nasync def ([A-Za-z0-9_]+)\(/g
  const matches = [...text.matchAll(regex)]

  return matches.map((match, index) => {
    const start = match.index ?? 0
    const next = matches[index + 1]?.index ?? text.length
    const blockText = text.slice(start, next)
    const functionStart = blockText.indexOf(`async def ${match[5]}(`)
    const functionText =
      functionStart >= 0 ? blockText.slice(functionStart) : blockText
    const signatureMatch = functionText.match(
      /^async def [\s\S]*?^\)\s*(?:->\s*[^:\n]+)?:/m
    )
    const signature = signatureMatch?.[0] ?? blockText

    return {
      offset: start,
      text: blockText,
      signature,
      functionName: match[5] ?? 'route',
      decorator: {
        method: (match[2] ?? 'get') as HttpMethod,
        path: match[3] ?? '""',
        body: match[4] ?? '',
      },
    }
  })
}

function extractPythonDefinitions(text: string, relativeFile: string) {
  const definitions = new Map<string, SourceExcerpt>()
  const regex =
    /^((?:async\s+)?def\s+([A-Za-z_][A-Za-z0-9_]*)\(|class\s+([A-Za-z_][A-Za-z0-9_]*)\()/gm
  const matches = [...text.matchAll(regex)]

  for (const [index, match] of matches.entries()) {
    const start = match.index ?? 0
    const next = matches[index + 1]?.index ?? text.length
    const name = match[2] ?? match[3]
    definitions.set(name, {
      title: `Helper: ${name}`,
      file: relativeFile,
      line: lineNumberFor(text, start),
      language: 'python',
      code: trimCode(text.slice(start, next)),
    })
  }

  return definitions
}

async function loadSchemaDefinitions(domain: string) {
  const file = join(apiRoot, 'domains', domain, 'schemas.py')
  const definitions = new Map<string, SourceExcerpt>()

  try {
    const text = await readFile(file, 'utf8')
    const relativeFile = toRepoPath(file)
    const regex = /^class\s+([A-Za-z_][A-Za-z0-9_]*)\(/gm
    const matches = [...text.matchAll(regex)]
    for (const [index, match] of matches.entries()) {
      const start = match.index ?? 0
      const next = matches[index + 1]?.index ?? text.length
      const name = match[1]
      definitions.set(name, {
        title: `Schema: ${name}`,
        file: relativeFile,
        line: lineNumberFor(text, start),
        language: 'python',
        code: trimCode(text.slice(start, next)),
      })
    }
  } catch {
    return definitions
  }

  return definitions
}

function extractRouterPrefix(text: string) {
  return text.match(/router\s*=\s*APIRouter\(\s*prefix="([^"]+)"/)?.[1]
}

function extractDecoratorValue(text: string, key: string) {
  return text.match(new RegExp(`${key}=([^,\\n]+)`))?.[1]?.trim()
}

async function loadDocsConstants(domain: string) {
  const docsFile = join(apiRoot, 'domains', domain, 'docs.py')
  const constants: Record<string, string> = {}

  try {
    const text = await readFile(docsFile, 'utf8')
    const regex = /([A-Z0-9_]+)\s*=\s*(?:"""([\s\S]*?)"""|"([^"]*)")/g
    for (const match of text.matchAll(regex)) {
      constants[`docs.${match[1]}`] = normalizeMarkdown(
        match[2] ?? match[3] ?? ''
      )
    }
  } catch {
    return constants
  }

  return constants
}

function resolveDocConstant(
  value: string | undefined,
  docs: Record<string, string>
) {
  if (!value) return undefined
  const trimmed = value.trim()
  if (trimmed in docs) return docs[trimmed]
  if (trimmed.startsWith('"') || trimmed.startsWith("'"))
    return unquote(trimmed)

  return undefined
}

function extractDependencies(signature: string) {
  const deps = [
    ...signature.matchAll(/Depends\(([^)]+)\)/g),
    ...signature.matchAll(
      /\b(AdminDep|SessionDep|ApiKeyDep|AuthServiceDep)\b/g
    ),
  ].map((match) => match[1].trim())

  return unique(deps)
}

function extractRequestModel(signature: string) {
  return signature.match(/\bbody:\s*([A-Z][A-Za-z0-9_]+)/)?.[1] ?? null
}

function extractImportedSchemas(fileText: string, block: string) {
  const importBlock = fileText.match(
    /from domains\.[^.]+\.schemas import \(([\s\S]*?)\)/
  )
  if (!importBlock) return []

  return importBlock[1]
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item && block.includes(item))
}

function extractHelperCalls(block: string) {
  const helpers = [
    ...extractNames(block, /\b(_[a-z][A-Za-z0-9_]+)\(/g),
    ...extractNames(block, /\b([a-z][A-Za-z0-9_]+)\(/g).filter((name) =>
      [
        'generate_id',
        'now_unix_seconds',
        'seal_session',
        'unseal_session',
        'merge_accounts',
        'select_account',
        'build_consent_path',
        'make_oauth_error',
        'sign_provider_jwt',
        'verify_provider_jwt',
      ].includes(name)
    ),
  ]

  return unique(helpers)
}

function extractErrors(block: string, source: string): ErrorInfo[] {
  const errors: ErrorInfo[] = []
  const appErrorRegex =
    /AppHTTPException\(\s*code="([^"]+)",\s*message="([^"]+)",\s*http_status_code=([\s\S]*?)\s*,?\s*\)/g
  for (const match of block.matchAll(appErrorRegex)) {
    errors.push({
      code: match[1],
      message: squish(match[2]),
      status: match[3].replace(/^status\./, '').trim(),
      source,
    })
  }

  const oauthErrorRegex = /make_oauth_error\("([^"]+)",\s*"([^"]+)",\s*(\d+)/g
  for (const match of block.matchAll(oauthErrorRegex)) {
    errors.push({
      code: match[1],
      message: squish(match[2]),
      status: match[3],
      source,
    })
  }

  return errors
}

async function extractClientCallers() {
  const callers: ClientCaller[] = []
  const sdkFile = join(repoRoot, 'packages/876-auth/src/client.ts')
  if (await fileExists(sdkFile)) {
    const sdkClient = await readFile(sdkFile, 'utf8')
    const sdkEndpoints = extractConstEndpoints(sdkClient, 'apiEndpoints')
    for (const [key, path] of Object.entries(sdkEndpoints)) {
      callers.push({
        package: '@876/sdk',
        method: `auth.${key}`,
        path,
        sourceFile: toRepoPath(sdkFile),
        sourceLine: lineNumberFor(
          sdkClient,
          sdkClient.indexOf(`apiEndpoints.${key}`)
        ),
      })
    }
  }

  const oauthFile = join(repoRoot, 'packages/876-auth/src/oauth.ts')
  if (await fileExists(oauthFile)) {
    const oauthClient = await readFile(oauthFile, 'utf8')
    const oauthEndpoints = extractConstEndpoints(oauthClient, 'oauthEndpoints')
    const oauthMethodNames: Record<string, string> = {
      authorize: 'oauth.getAuthorizationUrl',
      token: 'oauth.exchangeCodeForToken / oauth.refreshToken',
      userinfo: 'oauth.getUserInfo',
      revoke: 'oauth.revokeToken',
      introspect: 'oauth.introspectToken',
      discovery: 'oauth.discover',
    }
    for (const [key, path] of Object.entries(oauthEndpoints)) {
      callers.push({
        package: '@876/sdk',
        method: oauthMethodNames[key] ?? `oauth.${key}`,
        path,
        sourceFile: toRepoPath(oauthFile),
        sourceLine: lineNumberFor(
          oauthClient,
          oauthClient.indexOf(`oauthEndpoints.${key}`)
        ),
      })
    }
  }

  const adminFile = join(repoRoot, 'packages/admin/src/client.ts')
  const adminClient = await readFile(adminFile, 'utf8')
  const adminRegex =
    /adminRequest<[^>]+>\(runtime,\s*\{\s*method:\s*'([^']+)',\s*path:\s*(`[^`]+`|'[^']+')/g
  for (const match of adminClient.matchAll(adminRegex)) {
    const namespace = findAdminNamespace(adminClient, match.index ?? 0)
    const methodName = findAdminMethod(adminClient, match.index ?? 0)
    if (!namespace || !methodName) continue
    callers.push({
      package: '@876/admin',
      method: `${namespace}.${methodName}`,
      httpMethod: match[1].toLowerCase() as HttpMethod,
      path: pathTemplateToRoute(match[2]),
      sourceFile: toRepoPath(adminFile),
      sourceLine: lineNumberFor(adminClient, match.index ?? 0),
    })
  }

  return callers.sort((a, b) => a.path.localeCompare(b.path))
}

async function fileExists(file: string) {
  try {
    await access(file)
    return true
  } catch {
    return false
  }
}

function findAdminNamespace(text: string, index: number) {
  const namespaces = [
    'addresses',
    'apiKeys',
    'apps',
    'auditEvents',
    'auth',
    'features',
    'memberships',
    'organizations',
    'users',
  ]
  let found: { name: string; index: number } | null = null

  for (const namespace of namespaces) {
    const namespaceIndex = text.lastIndexOf(`${namespace}: {`, index)
    if (namespaceIndex === -1) continue
    if (!found || namespaceIndex > found.index)
      found = { name: namespace, index: namespaceIndex }
  }

  return found?.name
}

function findAdminMethod(text: string, index: number) {
  const before = text.slice(0, index)
  const matches = [...before.matchAll(/\n {6}(\w+)\([^)]*\)\s*\{/g)]

  return matches.at(-1)?.[1] ?? null
}

function extractConstEndpoints(text: string, constName: string) {
  const object = text.match(
    new RegExp(`const ${constName} = \\{([\\s\\S]*?)\\} as const`)
  )
  const endpoints: Record<string, string> = {}
  if (!object) return endpoints

  for (const match of object[1].matchAll(/(\w+):\s*'([^']+)'/g)) {
    endpoints[match[1]] = match[2]
  }

  return endpoints
}

async function extractAppCallers() {
  const files = (
    await Promise.all(
      ['apps/876/src', 'apps/console/src'].map((dir) =>
        readdirRecursive(join(repoRoot, dir))
      )
    )
  ).flat()
  const callers: AppCaller[] = []

  for (const file of files.filter((item) => /\.(ts|tsx)$/.test(item))) {
    const text = await readFile(file, 'utf8')
    const packageName = file.includes('/apps/console/')
      ? '@876/console'
      : '@876/app'
    const matches = text.matchAll(
      /(?:getAdminClient\(\)|\$876|client)\.([a-zA-Z]+)\.([a-zA-Z0-9_]+)/g
    )
    for (const match of matches) {
      callers.push({
        app: packageName,
        file: toRepoPath(file),
        symbol: `${match[1]}.${match[2]}`,
      })
    }
  }

  return callers
}

function matchAppCallers(
  clientCallers: ClientCaller[],
  appCallers: AppCaller[]
) {
  const methodNames = new Set(clientCallers.map((caller) => caller.method))

  return appCallers.filter((caller) => {
    return methodNames.has(caller.symbol)
  })
}

async function findTests() {
  const files = await readdirRecursive(join(apiRoot, 'tests'))

  return files
    .filter((file) => file.endsWith('.py'))
    .map(toRepoPath)
    .sort()
}

async function writeRoutePages(routes: RouteInfo[]) {
  await rm(join(contentRoot, 'api-internals'), { recursive: true, force: true })
  for (const domain of domainOrder) {
    await rm(join(contentRoot, domain), { recursive: true, force: true })
  }

  for (const domain of domainOrder) {
    const domainRoutes = routes.filter((route) => route.domain === domain)
    if (domainRoutes.length === 0) continue

    const domainDir = join(contentRoot, domain)
    await mkdir(domainDir, { recursive: true })
    await writeFile(
      join(domainDir, 'meta.json'),
      `${JSON.stringify(
        {
          title: domainLabels[domain] ?? titleCase(domain),
          pages: ['index', ...domainRoutes.map((route) => route.id)],
        },
        null,
        2
      )}\n`,
      'utf8'
    )
    await writeFile(
      join(domainDir, 'index.mdx'),
      frontmatter(
        domainLabels[domain] ?? titleCase(domain),
        `API, SDK, and implementation map for the ${domainLabels[domain] ?? domain} routes.`
      ) + `\n<RouteIndex domain="${domain}" />\n`,
      'utf8'
    )

    for (const route of domainRoutes) {
      await writeFile(
        join(domainDir, `${route.id}.mdx`),
        frontmatter(
          route.title,
          `${route.method.toUpperCase()} ${route.path}`,
          true
        ) + `\n<RouteDoc routeId="${route.id}" />\n`,
        'utf8'
      )
    }
  }

  await writeFile(
    join(contentRoot, 'meta.json'),
    `${JSON.stringify(
      {
        title: '876 Internal Docs',
        pages: ['index', ...domainOrder, 'reference'],
      },
      null,
      2
    )}\n`,
    'utf8'
  )
}

function buildBestSdkExample(
  callers: ClientCaller[],
  method: HttpMethod,
  path: string
) {
  const caller = callers[0]
  if (!caller) return null

  return buildSdkExample(caller, method, path)
}

function buildSdkExample(
  caller: ClientCaller,
  method: HttpMethod,
  path: string
) {
  if (caller.package === '@876/admin') {
    return `import { create876AdminClient } from '@876/admin'

const client = create876AdminClient({
  internalKey: process.env.API_INTERNAL_KEY,
})

const result = await client.${caller.method}(${exampleArgs(path)})

if (result.error) {
  console.error(result.error.code, result.error.message)
} else {
  console.log(result.data)
}`
  }

  if (caller.method.startsWith('oauth.')) {
    return `import { createSignInWith876 } from '@876/sdk/oauth'

const oauth = createSignInWith876({
  baseUrl: process.env.NEXT_PUBLIC_876_URL,
  clientId: process.env.OAUTH_CLIENT_ID,
  redirectUri: process.env.OAUTH_REDIRECT_URI,
})

const result = await oauth.${caller.method.replace('oauth.', '').split(' / ')[0]}(${exampleArgs(path)})

if (result.error) {
  console.error(result.error.code, result.error.message)
} else {
  console.log(result.data)
}`
  }

  return `import { create876Client } from '@876/sdk'

const $876 = create876Client({
  apiKey: process.env.NEXT_PUBLIC_876_API_KEY,
  credentials: 'include',
})

const result = await $876.${caller.method}(${exampleArgs(path)})

if (result.error) {
  console.error(result.error.code, result.error.message)
} else {
  console.log(result.data)
}`
}

function buildHttpExample(
  method: HttpMethod,
  path: string,
  requestModel: string | null
) {
  const upper = method.toUpperCase()
  const body =
    method === 'get' || method === 'delete'
      ? ''
      : ` \\
  --data '{ "object": "${requestModel ?? 'request'}" }'`

  return `curl "{baseUrl}${path}" \\
  --request ${upper} \\
  --header "Content-Type: application/json" \\
  --header "X-876-API-Key: $876_API_KEY"${body}`
}

function exampleArgs(path: string) {
  const params = [...path.matchAll(/\{([^}]+)\}/g)].map((match) => match[1])
  if (params.length === 0) return '{}'

  return params.map((param) => `'${param}_example'`).join(', ')
}

function frontmatter(title: string, description: string, full = false) {
  return `---\ntitle: ${JSON.stringify(title)}\ndescription: ${JSON.stringify(
    description
  )}${full ? '\nfull: true' : ''}\n---\n`
}

function extractNames(text: string, regex: RegExp) {
  return unique([...text.matchAll(regex)].map((match) => match[1]))
}

function normalizePath(path: string) {
  const normalized = path.replace(/\/+/g, '/')

  return normalized === '' ? '/' : normalized
}

function pathsCompatible(template: string, routePath: string) {
  return comparablePath(template) === comparablePath(routePath)
}

function pathTemplateToRoute(path: string) {
  return unquote(path)
    .replace(/\$\{([^}]+)\}/g, '{$1}')
    .replace(/`/g, '')
}

function comparablePath(path: string) {
  return pathTemplateToRoute(path).replace(/\{[^}]+\}/g, '{}')
}

function routeId(method: string, path: string) {
  const slug = path
    .replace(/^\//, '')
    .replace(/\{([^}]+)\}/g, 'by-$1')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()

  return `${method}-${slug || 'root'}`
}

function resolveAuth(domain: string, signature: string) {
  if (publicDomains.has(domain))
    return 'Public route; route-level checks apply.'
  if (signature.includes('AdminDep'))
    return 'Protected by app API key and x-internal-key AdminDep.'
  if (signature.includes('SessionDep'))
    return 'Protected by app API key and session principal.'

  return 'Protected by top-level app API key dependency.'
}

function titleFromSummary(summary: string, fallback: string) {
  const stripped = squish(summary).replace(/[.。]$/, '')
  if (stripped && stripped.length < 80) return stripped

  return titleFromFunction(fallback)
}

function titleFromFunction(name: string) {
  return titleCase(name.replace(/_/g, ' '))
}

function titleCase(value: string) {
  return value.replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function trimCode(value: string) {
  return value.trim().replace(/\n{3,}/g, '\n\n')
}

function normalizeMarkdown(value: string) {
  return value
    .replace(/\\\n/g, '\n')
    .replace(/\\\s+/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function squish(value: string) {
  return value.replace(/\\\s*/g, '').replace(/\s+/g, ' ').trim()
}

function unquote(value: string) {
  return value.replace(/^['"`]|['"`]$/g, '')
}

function lineNumberFor(text: string, index: number) {
  if (index < 0) return 1

  return text.slice(0, index).split('\n').length
}

function unique<T>(items: (T | null | undefined)[]) {
  return [...new Set(items.filter(Boolean) as T[])]
}

function uniqueExcerpts(excerpts: SourceExcerpt[]) {
  const seen = new Set<string>()

  return excerpts.filter((excerpt) => {
    const key = `${excerpt.file}:${excerpt.line}:${excerpt.title}`
    if (seen.has(key)) return false
    seen.add(key)

    return true
  })
}

function toRepoPath(path: string) {
  return relative(repoRoot, path).replaceAll('\\', '/')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
