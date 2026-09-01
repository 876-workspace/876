import { writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const outputPath = fileURLToPath(
  new URL('../../billing/contracts/v1/openapi.json', import.meta.url)
)

async function main(): Promise<void> {
  // Must precede the application import: the Prisma client is constructed at
  // module load and refuses to initialize without a database URL. No query is
  // ever issued — the document is built from the route registry alone.
  process.env.BILLING_DATABASE_URL ??=
    'postgresql://contract:contract@127.0.0.1:5432/contract'

  const [{ createApp }, { buildOpenApiDocument }] = await Promise.all([
    import('../src/application.ts'),
    import('../src/http/openapi/registry.ts'),
  ])

  createApp()
  const document = buildOpenApiDocument({
    registry: 'public',
    identityApiUrl: 'http://127.0.0.1:4000',
  })

  await writeFile(outputPath, `${JSON.stringify(document, null, 2)}\n`)
  console.log('Regenerated the frozen Billing v1 OpenAPI contract.')
}

void main()
