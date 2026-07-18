import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { parse } from 'dotenv'

const repoRoot = resolve(import.meta.dirname, '..')
const args = process.argv.slice(2)
const target = args.find((argument) => !argument.startsWith('--')) ?? 'all'
const useProcessEnv = args.includes('--process')
const hostsByTarget = {
  api: [],
  billing: ['billing'],
  console: ['console'],
  couriers: ['couriers'],
  all: ['console', 'billing', 'couriers'],
}
const hostNames = hostsByTarget[target]

if (!hostNames) {
  console.error(
    'Unknown widgets environment target. Use api, console, billing, couriers, or all.'
  )
  process.exit(1)
}

if (
  args.some((argument) => argument.startsWith('--') && argument !== '--process')
) {
  console.error('Unknown option. The only supported option is --process.')
  process.exit(1)
}

function loadLocalEnv(appName) {
  const appRoot = resolve(repoRoot, 'apps', appName)
  const values = {}

  for (const filename of ['.env', '.env.local']) {
    const path = resolve(appRoot, filename)
    if (existsSync(path)) Object.assign(values, parse(readFileSync(path)))
  }

  if (useProcessEnv) {
    for (const key of [
      'WIDGETS_DATABASE_URL',
      'WIDGETS_API_URL',
      'WIDGETS_SERVICE_KEY',
    ]) {
      if (process.env[key] !== undefined) values[key] = process.env[key]
    }
  }

  return values
}

function isUrl(value, protocols) {
  try {
    return protocols.includes(new URL(value).protocol)
  } catch {
    return false
  }
}

const issues = []
const widgetsEnv = loadLocalEnv('widgets-api')
const databaseUrl = widgetsEnv.WIDGETS_DATABASE_URL?.trim() ?? ''
const serviceKey = widgetsEnv.WIDGETS_SERVICE_KEY?.trim() ?? ''

const widgetsSource = useProcessEnv
  ? 'process environment'
  : 'apps/widgets-api/.env'

if (!databaseUrl) {
  issues.push(`${widgetsSource}: WIDGETS_DATABASE_URL is missing.`)
} else if (!isUrl(databaseUrl, ['postgres:', 'postgresql:'])) {
  issues.push(`${widgetsSource}: WIDGETS_DATABASE_URL must be a Postgres URL.`)
}

if (!serviceKey) {
  issues.push(`${widgetsSource}: WIDGETS_SERVICE_KEY is missing.`)
} else if (serviceKey.length < 32) {
  issues.push(
    `${widgetsSource}: WIDGETS_SERVICE_KEY must be at least 32 characters.`
  )
}

for (const hostName of hostNames) {
  const hostEnv = loadLocalEnv(hostName)
  const apiUrl = hostEnv.WIDGETS_API_URL?.trim() ?? ''
  const hostServiceKey = hostEnv.WIDGETS_SERVICE_KEY?.trim() ?? ''

  if (!apiUrl) {
    issues.push(`apps/${hostName}/.env: WIDGETS_API_URL is missing.`)
  } else if (!isUrl(apiUrl, ['http:', 'https:'])) {
    issues.push(
      `apps/${hostName}/.env: WIDGETS_API_URL must be an HTTP(S) URL.`
    )
  } else {
    const parsedApiUrl = new URL(apiUrl)
    if (
      parsedApiUrl.hostname.endsWith('.railway.internal') &&
      !parsedApiUrl.port
    ) {
      issues.push(
        `apps/${hostName}/.env: WIDGETS_API_URL uses Railway private networking but has no explicit port. Use e.g. http://876-widgets-api.railway.internal:3005.`
      )
    }
  }

  if (!hostServiceKey) {
    issues.push(`apps/${hostName}/.env: WIDGETS_SERVICE_KEY is missing.`)
  } else if (serviceKey && hostServiceKey !== serviceKey) {
    issues.push(
      `apps/${hostName}/.env: WIDGETS_SERVICE_KEY must match apps/widgets-api/.env.`
    )
  }

  if (hostEnv.WIDGETS_DATABASE_URL) {
    issues.push(
      `apps/${hostName}/.env: remove WIDGETS_DATABASE_URL; only widgets-api may connect to Widgets Postgres.`
    )
  }
}

if (issues.length > 0) {
  console.error('Widgets environment is not configured:')
  for (const issue of issues) console.error(`- ${issue}`)
  console.error('See docs/widgets.md#local-environment for setup instructions.')
  process.exit(1)
}

console.log(
  `Widgets environment is configured for ${target} from ${useProcessEnv ? 'process variables' : 'local files'}.`
)
