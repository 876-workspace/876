import { createApp } from '@/app'
import { buildOpenApiDocument } from '@/http/openapi/registry'
import {
  compareOpenApiContracts,
  formatOpenApiContractComparison,
  loadFrozenBillingContract,
  openApiContractsMatch,
} from '@/test/openapi-contract'

describe('Billing v1 OpenAPI contract', () => {
  it('matches the frozen FastAPI contract exactly', async () => {
    createApp()
    const expected = await loadFrozenBillingContract()
    const actual = buildOpenApiDocument({
      registry: 'public',
      identityApiUrl: 'http://127.0.0.1:4000',
    })
    const comparison = compareOpenApiContracts(expected, actual)

    if (!openApiContractsMatch(comparison))
      throw new Error(formatOpenApiContractComparison(comparison))
  })
})
