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
import { bankingController } from './banking.controller'
import { bankingDocs } from './banking.docs'
import {
  bankAccountCreateBodySchema,
  bankAccountDeletedSchema,
  bankAccountParamsSchema,
  bankAccountSchema,
  bankAccountUpdateBodySchema,
  bankTransactionCreateBodySchema,
  bankTransactionDeletedSchema,
  bankTransactionParamsSchema,
  bankTransactionSchema,
  bankTransactionUpdateBodySchema,
} from './banking.schemas'

const invalid: ResponseSpec = {
  description: 'Validation Error',
  schema: errorEnvelopeSchema,
}
const clientErrors = { '4XX': invalid }
export function createBankingRouter(resolveGuards: GuardResolver) {
  const api = createApiRouter({ tag: 'Billing', resolveGuards })
  api.get({
    path: '/banking/accounts',
    ...bankingDocs.listAccounts,
    operationId: 'billing-billing_get_banking_accounts',
    security: { kind: 'tenant', permission: 'banking:read' },
    responses: {
      200: {
        description: 'Successful Response',
        schema: successEnvelopeSchema(listObjectSchema(bankAccountSchema)),
      },
      ...clientErrors,
    },
    handler: bankingController.listAccounts,
  })
  api.post({
    path: '/banking/accounts',
    ...bankingDocs.createAccount,
    operationId: 'billing-billing_post_banking_accounts',
    security: { kind: 'tenant', permission: 'banking:write' },
    request: { body: bankAccountCreateBodySchema },
    responses: {
      201: {
        description: 'Successful Response',
        schema: successEnvelopeSchema(bankAccountSchema),
      },
      ...clientErrors,
    },
    handler: bankingController.createAccount,
  })
  api.get({
    path: '/banking/accounts/:accountId',
    ...bankingDocs.retrieveAccount,
    operationId: 'billing-billing_get_banking_accounts_accountId',
    security: { kind: 'tenant', permission: 'banking:read' },
    request: { params: bankAccountParamsSchema },
    responses: {
      200: {
        description: 'Successful Response',
        schema: successEnvelopeSchema(bankAccountSchema),
      },
      ...clientErrors,
    },
    handler: bankingController.retrieveAccount,
  })
  api.patch({
    path: '/banking/accounts/:accountId',
    ...bankingDocs.updateAccount,
    operationId: 'billing-billing_patch_banking_accounts_accountId',
    security: { kind: 'tenant', permission: 'banking:write' },
    request: {
      params: bankAccountParamsSchema,
      body: bankAccountUpdateBodySchema,
    },
    responses: {
      200: {
        description: 'Successful Response',
        schema: successEnvelopeSchema(bankAccountSchema),
      },
      ...clientErrors,
    },
    handler: bankingController.updateAccount,
  })
  api.delete({
    path: '/banking/accounts/:accountId',
    ...bankingDocs.deleteAccount,
    operationId: 'billing-billing_delete_banking_accounts_accountId',
    security: { kind: 'tenant', permission: 'banking:write' },
    request: { params: bankAccountParamsSchema },
    responses: {
      200: {
        description: 'Successful Response',
        schema: successEnvelopeSchema(bankAccountDeletedSchema),
      },
      ...clientErrors,
    },
    handler: bankingController.deleteAccount,
  })
  api.get({
    path: '/banking/accounts/:accountId/transactions',
    ...bankingDocs.listTransactions,
    operationId: 'billing-billing_get_banking_accounts_accountId_transactions',
    security: { kind: 'tenant', permission: 'banking:read' },
    request: { params: bankAccountParamsSchema },
    responses: {
      200: {
        description: 'Successful Response',
        schema: successEnvelopeSchema(listObjectSchema(bankTransactionSchema)),
      },
      ...clientErrors,
    },
    handler: bankingController.listTransactions,
  })
  api.post({
    path: '/banking/accounts/:accountId/transactions',
    ...bankingDocs.createTransaction,
    operationId: 'billing-billing_post_banking_accounts_accountId_transactions',
    security: { kind: 'tenant', permission: 'banking:write' },
    request: {
      params: bankAccountParamsSchema,
      body: bankTransactionCreateBodySchema,
    },
    responses: {
      201: {
        description: 'Successful Response',
        schema: successEnvelopeSchema(bankTransactionSchema),
      },
      ...clientErrors,
    },
    handler: bankingController.createTransaction,
  })
  api.get({
    path: '/banking/accounts/:accountId/transactions/:transactionId',
    ...bankingDocs.retrieveTransaction,
    operationId:
      'billing-billing_get_banking_accounts_accountId_transactions_transactionId',
    security: { kind: 'tenant', permission: 'banking:read' },
    request: { params: bankTransactionParamsSchema },
    responses: {
      200: {
        description: 'Successful Response',
        schema: successEnvelopeSchema(bankTransactionSchema),
      },
      ...clientErrors,
    },
    handler: bankingController.retrieveTransaction,
  })
  api.patch({
    path: '/banking/accounts/:accountId/transactions/:transactionId',
    ...bankingDocs.updateTransaction,
    operationId:
      'billing-billing_patch_banking_accounts_accountId_transactions_transactionId',
    security: { kind: 'tenant', permission: 'banking:write' },
    request: {
      params: bankTransactionParamsSchema,
      body: bankTransactionUpdateBodySchema,
    },
    responses: {
      200: {
        description: 'Successful Response',
        schema: successEnvelopeSchema(bankTransactionSchema),
      },
      ...clientErrors,
    },
    handler: bankingController.updateTransaction,
  })
  api.delete({
    path: '/banking/accounts/:accountId/transactions/:transactionId',
    ...bankingDocs.deleteTransaction,
    operationId:
      'billing-billing_delete_banking_accounts_accountId_transactions_transactionId',
    security: { kind: 'tenant', permission: 'banking:write' },
    request: { params: bankTransactionParamsSchema },
    responses: {
      200: {
        description: 'Successful Response',
        schema: successEnvelopeSchema(bankTransactionDeletedSchema),
      },
      ...clientErrors,
    },
    handler: bankingController.deleteTransaction,
  })
  return api.router
}
