/**
 * Sync the committed OpenAPI snapshot used to render the API Reference blocks.
 *
 * The docs build reads `apps/docs/openapi.json` statically so it never depends
 * on a live API server. Run this whenever API contracts change:
 *
 *   pnpm --filter @876/docs sync:openapi
 *
 * Source URL defaults to the local FastAPI dev server and can be overridden via
 * the OPENAPI_URL environment variable.
 */
import { writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUTPUT = resolve(__dirname, '..', 'openapi.json')
const SOURCE = process.env.OPENAPI_URL ?? 'http://127.0.0.1:4000/openapi.json'

async function main() {
  console.log(`[sync-openapi] fetching ${SOURCE}`)
  const res = await fetch(SOURCE)
  if (!res.ok) {
    throw new Error(
      `Failed to fetch OpenAPI schema (${res.status} ${res.statusText}). ` +
        `Is the API running? Try \`pnpm dev:api\` or set OPENAPI_URL.`
    )
  }

  const schema = await res.json()
  await writeFile(OUTPUT, `${JSON.stringify(schema, null, 2)}\n`, 'utf8')
  const operations = Object.keys(schema.paths ?? {}).length
  console.log(`[sync-openapi] wrote ${OUTPUT} (${operations} paths)`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
