import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const ROOT = resolve(import.meta.dirname, '..')

const TARGETS = [
  'apps/api/wrangler.jsonc',
  'apps/invoice/wrangler.jsonc',
  'apps/billing/wrangler.jsonc',
  'apps/couriers/wrangler.jsonc',
  'apps/console/wrangler.jsonc',
]

function billingApiUrl(source, file) {
  const match = source.match(/"BILLING_API_URL"\s*:\s*"([^"]+)"/)
  if (!match?.[1]) {
    throw new Error(`${file}: BILLING_API_URL is missing from production vars.`)
  }
  return match[1].trim()
}

function serviceOrigin(raw, file) {
  let url
  try {
    url = new URL(raw)
  } catch {
    throw new Error(`${file}: BILLING_API_URL is not a valid URL.`)
  }

  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new Error(`${file}: BILLING_API_URL must use http:// or https://.`)
  }
  if (url.username || url.password) {
    throw new Error(`${file}: BILLING_API_URL must not contain credentials.`)
  }
  if (url.pathname !== '/' || url.search || url.hash) {
    throw new Error(
      `${file}: BILLING_API_URL must be a service origin without path, query, or fragment.`
    )
  }
  return url.origin
}

const configured = []
for (const file of TARGETS) {
  const source = await readFile(resolve(ROOT, file), 'utf8')
  configured.push({ file, origin: serviceOrigin(billingApiUrl(source, file), file) })
}

const [first, ...rest] = configured
if (!first) throw new Error('No Billing API target files configured.')

const mismatches = rest.filter((entry) => entry.origin !== first.origin)
if (mismatches.length > 0) {
  const detail = configured
    .map((entry) => `  ${entry.file}: ${entry.origin}`)
    .join('\n')
  throw new Error(
    `Billing API production targets disagree. All first-party Billing consumers must point at one data plane:\n${detail}`
  )
}

console.log(
  `Billing API target contract OK: ${first.origin} (${configured.length} configs)`
)
