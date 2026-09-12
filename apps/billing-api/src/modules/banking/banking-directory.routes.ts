import {
  createApiRouter,
  type GuardResolver,
  type ResponseSpec,
} from '@/http/api-router'
import {
  errorEnvelopeSchema,
  listObjectSchema,
  successEnvelopeSchema,
} from '@/http/envelope'

import { bankingDirectoryController } from './banking-directory.controller'
import {
  bankingDirectoryBankParamsSchema,
  bankingDirectoryBankSchema,
  bankingDirectoryBanksQuerySchema,
  bankingDirectoryBranchSchema,
  bankingDirectoryBranchesQuerySchema,
} from './banking-directory.schemas'

const invalid: ResponseSpec = {
  description: 'Validation Error',
  schema: errorEnvelopeSchema,
}

export function createBankingDirectoryRouter(resolveGuards: GuardResolver) {
  const api = createApiRouter({ tag: 'Billing', resolveGuards })

  api.get({
    path: '/banking/directory/banks',
    operationId: 'billing-banking_list_directory_banks',
    summary: 'List banks from the shared financial directory',
    security: { kind: 'tenant', permission: 'banking:read' },
    request: { query: bankingDirectoryBanksQuerySchema },
    responses: {
      200: {
        description: 'Bank directory list returned.',
        schema: successEnvelopeSchema(listObjectSchema(bankingDirectoryBankSchema)),
      },
      '4XX': invalid,
    },
    handler: bankingDirectoryController.listBanks,
  })

  api.get({
    path: '/banking/directory/banks/:bankId/branches',
    operationId: 'billing-banking_list_directory_branches',
    summary: 'List branches for a shared-directory bank',
    security: { kind: 'tenant', permission: 'banking:read' },
    request: {
      params: bankingDirectoryBankParamsSchema,
      query: bankingDirectoryBranchesQuerySchema,
    },
    responses: {
      200: {
        description: 'Bank branch directory list returned.',
        schema: successEnvelopeSchema(
          listObjectSchema(bankingDirectoryBranchSchema)
        ),
      },
      '4XX': invalid,
    },
    handler: bankingDirectoryController.listBranches,
  })

  api.get({
    path: '/banking/directory/branches',
    operationId: 'billing-banking_list_directory_branches_by_ids',
    summary: 'List shared-directory branches across banks by ids',
    security: { kind: 'tenant', permission: 'banking:read' },
    request: { query: bankingDirectoryBranchesQuerySchema },
    responses: {
      200: {
        description: 'Bank branch directory list returned.',
        schema: successEnvelopeSchema(
          listObjectSchema(bankingDirectoryBranchSchema)
        ),
      },
      '4XX': invalid,
    },
    handler: bankingDirectoryController.listBranchesByIds,
  })

  return api.router
}
