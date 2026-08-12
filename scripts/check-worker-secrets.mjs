/**
 * Verifies that every production Worker has the secrets it needs at runtime.
 *
 * The manifest mirrors the "Production key inventory" in
 * `docs/cloudflare.md`. Non-secret values supplied by `wrangler.jsonc` and
 * `NEXT_PUBLIC_*` values inlined at build time are intentionally excluded.
 *
 * `wrangler secret list` returns binding names and types only. This script
 * never reads or prints secret values.
 *
 * Run via `pnpm check:worker-secrets`, optionally followed by one Worker name.
 */
import { spawnSync } from 'node:child_process'

import { CLOUDFLARE_WORKERS } from './cloudflare-release-contract.mjs'

const REQUIRED_SECRETS = Object.fromEntries(
  Object.entries(CLOUDFLARE_WORKERS).map(([worker, contract]) => [
    worker,
    contract.requiredSecrets,
  ])
)

const requestedWorkers = process.argv.slice(2)

if (requestedWorkers.length > 1) {
  console.error(
    'Usage: node scripts/check-worker-secrets.mjs [worker-name]\n\n' +
      'Pass at most one Worker name.'
  )
  process.exit(1)
}

const [requestedWorker] = requestedWorkers
if (requestedWorker && !REQUIRED_SECRETS[requestedWorker]) {
  console.error(
    `Unknown Worker "${requestedWorker}". Expected one of:\n` +
      Object.keys(REQUIRED_SECRETS)
        .map((worker) => `  ${worker}`)
        .join('\n')
  )
  process.exit(1)
}

const workers = requestedWorker
  ? [requestedWorker]
  : Object.keys(REQUIRED_SECRETS)

/**
 * Classifies common Wrangler failures without echoing Wrangler's output.
 *
 * @param output - Combined stdout and stderr from Wrangler.
 * @returns A safe, user-facing error category.
 */
function classifyWranglerError(output) {
  if (
    /not authenticated|authentication error|authenticate request|wrangler login|cloudflare_api_token|invalid api token|code:\s*1000[01]/i.test(
      output
    )
  ) {
    return 'not-authenticated'
  }

  if (
    /worker.*(?:does not exist|not found|could not find|couldn't find)|(?:does not exist|not found|could not find|couldn't find).*worker|no such worker|code:\s*10090/i.test(
      output
    )
  ) {
    return 'worker-not-found'
  }

  return 'wrangler-error'
}

/**
 * Lists one Worker's secret binding names.
 *
 * @param worker - Cloudflare Worker name.
 * @returns The check result. Secret values are never requested or retained.
 */
function checkWorker(worker) {
  if (REQUIRED_SECRETS[worker].length === 0)
    return { worker, status: 'present', missing: [] }

  const result = spawnSync(
    'npx',
    ['wrangler', 'secret', 'list', '--name', worker],
    {
      encoding: 'utf8',
    }
  )

  if (result.error) {
    return { worker, status: 'wrangler-error' }
  }

  if (result.status !== 0) {
    return {
      worker,
      status: classifyWranglerError(`${result.stdout}\n${result.stderr}`),
    }
  }

  let bindings
  try {
    bindings = JSON.parse(result.stdout)
  } catch {
    return { worker, status: 'invalid-response' }
  }

  if (
    !Array.isArray(bindings) ||
    bindings.some(
      (binding) =>
        typeof binding !== 'object' ||
        binding === null ||
        typeof binding.name !== 'string' ||
        typeof binding.type !== 'string'
    )
  ) {
    return { worker, status: 'invalid-response' }
  }

  const actual = new Set(bindings.map(({ name }) => name))
  const missing = REQUIRED_SECRETS[worker].filter((name) => !actual.has(name))

  return {
    worker,
    status: missing.length === 0 ? 'present' : 'missing',
    missing,
  }
}

function formatResult(result) {
  const lines = [result.worker]

  if (result.status === 'present') {
    lines.push('  all required secrets present')
    return lines
  }

  if (result.status === 'missing') {
    lines.push('  missing:')
    lines.push(...result.missing.map((name) => `    - ${name}`))
  } else if (result.status === 'not-authenticated') {
    lines.push(
      '  error: not authenticated with Cloudflare; run `npx wrangler login` ' +
        'or set `CLOUDFLARE_API_TOKEN`.'
    )
  } else if (result.status === 'worker-not-found') {
    lines.push(
      '  error: Worker does not exist or is not visible to the authenticated account.'
    )
  } else if (result.status === 'invalid-response') {
    lines.push('  error: Wrangler returned an unreadable secret list.')
  } else {
    lines.push(
      '  error: Wrangler could not list secrets; check the command and Cloudflare status.'
    )
  }

  return lines
}

const results = workers.map(checkWorker)
const missingCount = results.filter(({ status }) => status === 'missing').length
const errorCount = results.filter(
  ({ status }) => !['present', 'missing'].includes(status)
).length
const report = results.flatMap((result, index) => [
  ...(index > 0 ? [''] : []),
  ...formatResult(result),
])

if (missingCount === 0 && errorCount === 0) {
  report.push(
    '',
    `All required Worker secrets are present (${results.length} ${
      results.length === 1 ? 'Worker' : 'Workers'
    } checked).`
  )
  console.log(report.join('\n'))
  process.exit(0)
}

report.push('', 'Worker secret preflight failed.')
if (missingCount > 0) {
  report.push(
    `  ${missingCount} ${
      missingCount === 1 ? 'Worker is' : 'Workers are'
    } missing required secrets.`
  )
}
if (errorCount > 0) {
  report.push(
    `  ${errorCount} Worker ${
      errorCount === 1 ? 'check failed' : 'checks failed'
    } before secrets could be compared.`
  )
}

console.error(report.join('\n'))
process.exit(1)
