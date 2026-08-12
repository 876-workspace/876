import { CLOUDFLARE_WORKERS } from './cloudflare-release-contract.mjs'

const [requestedWorker] = process.argv.slice(2)
const attempts = Number.parseInt(process.env.READINESS_ATTEMPTS ?? '12', 10)
const delayMs = Number.parseInt(process.env.READINESS_DELAY_MS ?? '5000', 10)

if (!requestedWorker || !CLOUDFLARE_WORKERS[requestedWorker]) {
  console.error('Usage: node scripts/check-worker-readiness.mjs <worker-name>')
  process.exit(1)
}

const sleep = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds))

async function probe(worker) {
  const { readinessUrl } = CLOUDFLARE_WORKERS[worker]
  let lastResult = 'no response'

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(readinessUrl, {
        headers: { accept: 'application/json' },
      })
      const payload = await response.json().catch(() => null)
      const status = payload?.status ?? payload?.data?.status

      if (response.ok && ['ok', 'ready'].includes(status)) {
        console.log(`${worker}: ready (${readinessUrl})`)
        return
      }

      lastResult = `HTTP ${response.status}, status=${String(status)}`
    } catch (error) {
      lastResult = error instanceof Error ? error.message : String(error)
    }

    if (attempt < attempts) await sleep(delayMs)
  }

  throw new Error(`${worker} failed readiness: ${lastResult}`)
}

const probes = new Map()

function probeWithDependencies(worker) {
  const existing = probes.get(worker)
  if (existing) return existing

  const pending = Promise.all(
    CLOUDFLARE_WORKERS[worker].dependencies.map(probeWithDependencies)
  ).then(() => probe(worker))
  probes.set(worker, pending)

  return pending
}

await probeWithDependencies(requestedWorker)
