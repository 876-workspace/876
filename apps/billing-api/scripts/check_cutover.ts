import { readFile } from 'node:fs/promises'

type Operation = `${Uppercase<string>} ${string}`
const methods = new Set(['delete', 'get', 'patch', 'post', 'put'])

function argument(name: string): string | undefined {
  const index = process.argv.indexOf(name)
  return index < 0 ? undefined : process.argv[index + 1]
}

function operations(document: { paths?: Record<string, object> }) {
  const result = new Set<Operation>()
  for (const [path, item] of Object.entries(document.paths ?? {}))
    for (const method of Object.keys(item))
      if (methods.has(method))
        result.add(`${method.toUpperCase()} ${path}` as Operation)
  return result
}

const baseUrl = (argument('--base-url') ?? process.env.BILLING_API_URL ?? '')
  .replace(/\/+$/, '')
const expectedWriter = argument('--expected-writer') ?? 'express'
const failures: string[] = []
let writer: string | null = null
let actual = new Set<Operation>()

if (!baseUrl) failures.push('billing_api_url_missing')
else {
  try {
    const [health, readiness, openapi] = await Promise.all([
      fetch(`${baseUrl}/health`),
      fetch(`${baseUrl}/ready`),
      fetch(`${baseUrl}/openapi.json`),
    ])
    const healthPayload = (await health.json()) as { status?: string }
    const readinessPayload = (await readiness.json()) as {
      status?: string
      writer?: string
    }
    writer = readinessPayload.writer ?? null
    if (!health.ok || healthPayload.status !== 'ok')
      failures.push('health_check_failed')
    if (!readiness.ok || readinessPayload.status !== 'ready')
      failures.push('readiness_check_failed')
    if (writer !== expectedWriter) failures.push('writer_lease_mismatch')
    if (!openapi.ok) failures.push('openapi_unavailable')
    else actual = operations((await openapi.json()) as { paths?: Record<string, object> })

    const contract = JSON.parse(
      await readFile(
        new URL('../../billing/contracts/v1/openapi.json', import.meta.url),
        'utf8'
      )
    ) as { paths?: Record<string, object> }
    const expected = operations(contract)
    if (
      actual.size !== expected.size ||
      [...expected].some((operation) => !actual.has(operation))
    )
      failures.push('contract_operation_mismatch')
  } catch {
    failures.push('billing_api_unreachable')
  }
}

console.log(
  JSON.stringify({
    object: 'billing_cutover_check',
    valid: failures.length === 0,
    writer,
    routes: new Set([...actual].map((item) => item.slice(item.indexOf(' ') + 1)))
      .size,
    operations: actual.size,
    failures,
  })
)
if (failures.length) process.exitCode = baseUrl ? 1 : 2
