/**
 * Reports whether a Cloudflare Worker script already exists.
 *
 * A Worker cannot take `wrangler secret put` before it exists, and wrangler
 * refuses a first deploy while any secret named in `wrangler.jsonc` is unset —
 * so a brand-new Worker has to be created by a deploy that carries its secrets
 * with it. The deploy workflow needs to tell those two situations apart before
 * it decides which path to take, and the secret preflight is not the place to
 * do that: "the Worker does not exist yet" is the normal state of a Worker
 * nobody has deployed, not a misconfiguration.
 *
 * Prints nothing but a one-word verdict, and never requests secret values.
 *
 *   node scripts/worker-exists.mjs 876-invoice
 *
 * Exit codes:
 *   0  the Worker exists
 *   1  the Worker does not exist
 *   2  the state could not be determined (auth failure, wrangler error)
 */
import { spawnSync } from 'node:child_process'

const [worker] = process.argv.slice(2)

if (!worker) {
  console.error('Usage: node scripts/worker-exists.mjs <worker-name>')
  process.exit(2)
}

const result = spawnSync(
  'npx',
  ['wrangler', 'secret', 'list', '--name', worker],
  { encoding: 'utf8' }
)

if (result.error) {
  console.log('unknown')
  process.exit(2)
}

if (result.status === 0) {
  console.log('exists')
  process.exit(0)
}

const output = `${result.stdout}\n${result.stderr}`
const notFound =
  /worker.*(?:does not exist|not found|could not find|couldn't find)|(?:does not exist|not found|could not find|couldn't find).*worker|no such worker|code:\s*10090/i.test(
    output
  )

if (notFound) {
  console.log('missing')
  process.exit(1)
}

console.log('unknown')
process.exit(2)
