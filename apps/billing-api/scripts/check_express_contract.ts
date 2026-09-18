import {
  compareOpenApiContracts,
  formatOpenApiContractComparison,
  INTENTIONAL_ADDITIONS,
  loadFrozenBillingContract,
  openApiContractsMatch,
} from '../src/test/openapi-contract.js'

async function main(): Promise<void> {
  process.env.BILLING_DATABASE_URL ??=
    'postgresql://contract:contract@127.0.0.1:5432/contract'

  const [{ createApp }, { buildOpenApiDocument }] = await Promise.all([
    import('../src/application.ts'),
    import('../src/http/openapi/registry.ts'),
  ])

  createApp()
  const actual = buildOpenApiDocument({
    registry: 'public',
    identityApiUrl: 'http://127.0.0.1:4000',
  })
  const expected = await loadFrozenBillingContract()
  const comparison = compareOpenApiContracts(expected, actual, {
    intentionalAdditions: INTENTIONAL_ADDITIONS,
  })

  console.log(formatOpenApiContractComparison(comparison))
  if (!openApiContractsMatch(comparison)) process.exitCode = 1
}

void main()
