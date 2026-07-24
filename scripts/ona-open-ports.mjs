import { spawnSync } from 'node:child_process'

const args = process.argv.slice(2)
const target = args.find((argument) => !argument.startsWith('--'))

// One entry per app that can run in local dev. Mirrors the port table in
// .devcontainer/devcontainer.json and .gitpod.yml.
const PORTS = {
  api: { port: 4000, name: '876-api' },
  'widgets-api': { port: 3005, name: '876-widgets-api' },
  app: { port: 3000, name: '876-app' },
  enterprise: { port: 3001, name: '876-enterprise' },
  console: { port: 3002, name: '876-console' },
  'billing-api': { port: 4004, name: '876-billing-api' },
  'billing-app': { port: 3004, name: '876-billing-app' },
  couriers: { port: 3003, name: '876-couriers' },
  docs: { port: 3003, name: '876-docs' },
}

// Mirrors the turbo --filter sets in package.json's dev:* scripts exactly —
// keep these two in sync when a dev:* script's filter list changes.
const TARGETS = {
  all: [
    'api',
    'widgets-api',
    'app',
    'enterprise',
    'console',
    'billing-api',
    'billing-app',
    'docs',
  ],
  dev: [
    'api',
    'widgets-api',
    'app',
    'enterprise',
    'console',
    'billing-api',
    'billing-app',
  ],
  876: ['api', 'app'],
  enterprise: ['api', 'enterprise'],
  api: ['api'],
  app: ['app'],
  org: ['enterprise'],
  console: ['api', 'widgets-api', 'billing-api', 'billing-app', 'console'],
  billing: ['api', 'widgets-api', 'billing-api', 'billing-app'],
  'billing:api': ['api', 'billing-api'],
  widgets: ['widgets-api'],
  'console:enterprise': [
    'api',
    'widgets-api',
    'billing-app',
    'console',
    'enterprise',
  ],
  'console:billing': [
    'api',
    'widgets-api',
    'console',
    'billing-api',
    'billing-app',
  ],
  couriers: ['api', 'widgets-api', 'billing-api', 'billing-app', 'couriers'],
  'couriers:console': [
    'api',
    'widgets-api',
    'billing-api',
    'billing-app',
    'couriers',
    'console',
  ],
  docs: ['docs'],
}

if (!target || !TARGETS[target]) {
  console.error(
    `Unknown Ona ports target. Use one of: ${Object.keys(TARGETS).join(', ')}.`
  )
  process.exit(1)
}

const ona = spawnSync('ona', ['version'], { stdio: 'ignore' })
if (ona.error || ona.status !== 0) {
  console.log(
    '[ona-open-ports] ona CLI not found or not authenticated — skipping public port sharing (this is expected outside an Ona environment).'
  )
  process.exit(0)
}

const appKeys = TARGETS[target]
const opened = []
const failed = []

for (const key of appKeys) {
  const { port, name } = PORTS[key]
  const openResult = spawnSync(
    'ona',
    [
      'environment',
      'port',
      'open',
      String(port),
      '--name',
      name,
      '--dont-wait',
    ],
    { encoding: 'utf8' }
  )

  if (openResult.status !== 0) {
    failed.push({
      port,
      name,
      error: (openResult.stderr || openResult.stdout || '').trim(),
    })
    continue
  }

  // `open --dont-wait` prints nothing on success; look the URL up separately.
  const getResult = spawnSync(
    'ona',
    ['environment', 'port', 'get', String(port), '--field', 'url'],
    { encoding: 'utf8' }
  )
  const url =
    getResult.status === 0
      ? (getResult.stdout || '').trim()
      : '(unknown — run `ona environment port list`)'
  opened.push({ port, name, url })
}

for (const { port, name, url } of opened) {
  console.log(`${name} (${port}): ${url}`)
}

for (const { port, name, error } of failed) {
  console.error(`[ona-open-ports] failed to open ${name} (${port}): ${error}`)
}
