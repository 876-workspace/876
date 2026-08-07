/**
 * Financial directory routes.
 *
 * The router's default tier is `apiKey`, matching the FastAPI router being
 * mounted on `protected_router`; every mutation overrides it to `admin`, which
 * is where each handler's `_admin: AdminDep` went. Tiers stack, so `admin`
 * already implies the app key.
 *
 * Route order follows the Python file. `/bank-branches/:branch_id` and
 * `/banks/:bank_id` are different literal prefixes, so neither can capture the
 * other — but the nested `/banks/:bank_id/branches` is declared beside its
 * parent to keep that visible.
 */

import { attachPrincipal } from '@/http/auth'
import { listObjectSchema } from '@/http/envelope'
import { createApiRouter, type GuardResolver } from '@/http/api-router'

import * as controller from './financial.controller'
import * as docs from './directory.docs'
import {
  accountIdParamsSchema,
  bankAccountDeletedSchema,
  bankBranchDeletedSchema,
  bankDeletedSchema,
  bankIdParamsSchema,
  branchIdParamsSchema,
  creditUnionBranchDeletedSchema,
  creditUnionDeletedSchema,
  creditUnionIdParamsSchema,
  listDirectoryQuerySchema,
  retrieveDirectoryQuerySchema,
} from './directory.schemas'
import {
  bankAccountCreateSchema,
  bankAccountSchema,
  bankAccountUpdateSchema,
  bankBranchCreateSchema,
  bankBranchSchema,
  bankBranchUpdateSchema,
  bankCreateSchema,
  bankSchema,
  bankUpdateSchema,
  creditUnionBranchCreateSchema,
  creditUnionBranchSchema,
  creditUnionBranchUpdateSchema,
  creditUnionCreateSchema,
  creditUnionSchema,
  creditUnionUpdateSchema,
} from './financial.schemas'

export function registerFinancialRoutes(resolveGuards: GuardResolver) {
  const api = createApiRouter({
    tag: 'Directory',
    prefix: '/directory',
    security: 'apiKey',
    resolveGuards,
  })

  // --- Banks ---

  api.get({
    path: '/banks',
    middleware: [attachPrincipal],
    operationId: 'directory-list_banks',
    summary: docs.LIST_BANKS_SUMMARY,
    description: docs.LIST_BANKS_DESCRIPTION,
    request: { query: listDirectoryQuerySchema },
    responses: {
      200: {
        description: 'Bank list returned.',
        schema: listObjectSchema(bankSchema),
      },
    },
    handler: controller.listBanks,
  })

  api.get({
    path: '/banks/:bank_id',
    middleware: [attachPrincipal],
    operationId: 'directory-retrieve_bank',
    summary: docs.RETRIEVE_BANK_SUMMARY,
    description: docs.RETRIEVE_BANK_DESCRIPTION,
    request: {
      params: bankIdParamsSchema,
      query: retrieveDirectoryQuerySchema,
    },
    responses: {
      200: { description: 'Bank returned.', schema: bankSchema },
      404: { description: 'Bank not found.' },
    },
    handler: controller.retrieveBank,
  })

  api.post({
    path: '/banks',
    security: 'admin',
    operationId: 'directory-create_bank',
    summary: docs.CREATE_BANK_SUMMARY,
    description: docs.CREATE_BANK_DESCRIPTION,
    request: { body: bankCreateSchema },
    responses: {
      201: { description: 'Bank created.', schema: bankSchema },
      409: { description: 'A bank with this code already exists.' },
    },
    handler: controller.createBank,
  })

  api.patch({
    path: '/banks/:bank_id',
    security: 'admin',
    operationId: 'directory-update_bank',
    summary: docs.UPDATE_BANK_SUMMARY,
    description: docs.UPDATE_BANK_DESCRIPTION,
    request: { params: bankIdParamsSchema, body: bankUpdateSchema },
    responses: {
      200: { description: 'Bank updated.', schema: bankSchema },
      404: { description: 'Bank not found.' },
    },
    handler: controller.updateBank,
  })

  api.delete({
    path: '/banks/:bank_id',
    security: 'admin',
    operationId: 'directory-delete_bank',
    summary: docs.DELETE_BANK_SUMMARY,
    description: docs.DELETE_BANK_DESCRIPTION,
    request: { params: bankIdParamsSchema },
    responses: {
      200: { description: 'Bank deleted.', schema: bankDeletedSchema },
      404: { description: 'Bank not found.' },
    },
    handler: controller.deleteBank,
  })

  // --- Bank branches ---

  api.get({
    path: '/banks/:bank_id/branches',
    middleware: [attachPrincipal],
    operationId: 'directory-list_bank_branches',
    summary: docs.LIST_BANK_BRANCHES_SUMMARY,
    description: docs.LIST_BANK_BRANCHES_DESCRIPTION,
    request: { params: bankIdParamsSchema, query: listDirectoryQuerySchema },
    responses: {
      200: {
        description: 'Bank branch list returned.',
        schema: listObjectSchema(bankBranchSchema),
      },
      404: { description: 'Bank not found.' },
    },
    handler: controller.listBankBranches,
  })

  api.get({
    path: '/bank-branches/:branch_id',
    middleware: [attachPrincipal],
    operationId: 'directory-retrieve_bank_branch',
    summary: docs.RETRIEVE_BANK_BRANCH_SUMMARY,
    description: docs.RETRIEVE_BANK_BRANCH_DESCRIPTION,
    request: {
      params: branchIdParamsSchema,
      query: retrieveDirectoryQuerySchema,
    },
    responses: {
      200: {
        description: 'Bank branch returned.',
        schema: bankBranchSchema,
      },
      404: { description: 'Bank branch not found.' },
    },
    handler: controller.retrieveBankBranch,
  })

  api.post({
    path: '/banks/:bank_id/branches',
    security: 'admin',
    operationId: 'directory-create_bank_branch',
    summary: docs.CREATE_BANK_BRANCH_SUMMARY,
    description: docs.CREATE_BANK_BRANCH_DESCRIPTION,
    request: { params: bankIdParamsSchema, body: bankBranchCreateSchema },
    responses: {
      201: {
        description: 'Bank branch created.',
        schema: bankBranchSchema,
      },
      404: { description: 'Bank not found.' },
      409: {
        description:
          'A branch with this transit number already exists for this bank.',
      },
    },
    handler: controller.createBankBranch,
  })

  api.patch({
    path: '/bank-branches/:branch_id',
    security: 'admin',
    operationId: 'directory-update_bank_branch',
    summary: docs.UPDATE_BANK_BRANCH_SUMMARY,
    description: docs.UPDATE_BANK_BRANCH_DESCRIPTION,
    request: { params: branchIdParamsSchema, body: bankBranchUpdateSchema },
    responses: {
      200: {
        description: 'Bank branch updated.',
        schema: bankBranchSchema,
      },
      404: { description: 'Bank branch not found.' },
    },
    handler: controller.updateBankBranch,
  })

  api.delete({
    path: '/bank-branches/:branch_id',
    security: 'admin',
    operationId: 'directory-delete_bank_branch',
    summary: docs.DELETE_BANK_BRANCH_SUMMARY,
    description: docs.DELETE_BANK_BRANCH_DESCRIPTION,
    request: { params: branchIdParamsSchema },
    responses: {
      200: {
        description: 'Bank branch deleted.',
        schema: bankBranchDeletedSchema,
      },
      404: { description: 'Bank branch not found.' },
    },
    handler: controller.deleteBankBranch,
  })

  // --- Credit unions ---

  api.get({
    path: '/credit-unions',
    middleware: [attachPrincipal],
    operationId: 'directory-list_credit_unions',
    summary: docs.LIST_CREDIT_UNIONS_SUMMARY,
    description: docs.LIST_CREDIT_UNIONS_DESCRIPTION,
    request: { query: listDirectoryQuerySchema },
    responses: {
      200: {
        description: 'Credit union list returned.',
        schema: listObjectSchema(creditUnionSchema),
      },
    },
    handler: controller.listCreditUnions,
  })

  api.get({
    path: '/credit-unions/:credit_union_id',
    middleware: [attachPrincipal],
    operationId: 'directory-retrieve_credit_union',
    summary: docs.RETRIEVE_CREDIT_UNION_SUMMARY,
    description: docs.RETRIEVE_CREDIT_UNION_DESCRIPTION,
    request: {
      params: creditUnionIdParamsSchema,
      query: retrieveDirectoryQuerySchema,
    },
    responses: {
      200: {
        description: 'Credit union returned.',
        schema: creditUnionSchema,
      },
      404: { description: 'Credit union not found.' },
    },
    handler: controller.retrieveCreditUnion,
  })

  api.post({
    path: '/credit-unions',
    security: 'admin',
    operationId: 'directory-create_credit_union',
    summary: docs.CREATE_CREDIT_UNION_SUMMARY,
    description: docs.CREATE_CREDIT_UNION_DESCRIPTION,
    request: { body: creditUnionCreateSchema },
    responses: {
      201: {
        description: 'Credit union created.',
        schema: creditUnionSchema,
      },
    },
    handler: controller.createCreditUnion,
  })

  api.patch({
    path: '/credit-unions/:credit_union_id',
    security: 'admin',
    operationId: 'directory-update_credit_union',
    summary: docs.UPDATE_CREDIT_UNION_SUMMARY,
    description: docs.UPDATE_CREDIT_UNION_DESCRIPTION,
    request: {
      params: creditUnionIdParamsSchema,
      body: creditUnionUpdateSchema,
    },
    responses: {
      200: {
        description: 'Credit union updated.',
        schema: creditUnionSchema,
      },
      404: { description: 'Credit union not found.' },
    },
    handler: controller.updateCreditUnion,
  })

  api.delete({
    path: '/credit-unions/:credit_union_id',
    security: 'admin',
    operationId: 'directory-delete_credit_union',
    summary: docs.DELETE_CREDIT_UNION_SUMMARY,
    description: docs.DELETE_CREDIT_UNION_DESCRIPTION,
    request: { params: creditUnionIdParamsSchema },
    responses: {
      200: {
        description: 'Credit union deleted.',
        schema: creditUnionDeletedSchema,
      },
      404: { description: 'Credit union not found.' },
    },
    handler: controller.deleteCreditUnion,
  })

  // --- Credit union branches ---

  api.get({
    path: '/credit-unions/:credit_union_id/branches',
    middleware: [attachPrincipal],
    operationId: 'directory-list_credit_union_branches',
    summary: docs.LIST_CREDIT_UNION_BRANCHES_SUMMARY,
    description: docs.LIST_CREDIT_UNION_BRANCHES_DESCRIPTION,
    request: {
      params: creditUnionIdParamsSchema,
      query: listDirectoryQuerySchema,
    },
    responses: {
      200: {
        description: 'Credit union branch list returned.',
        schema: listObjectSchema(creditUnionBranchSchema),
      },
      404: { description: 'Credit union not found.' },
    },
    handler: controller.listCreditUnionBranches,
  })

  api.get({
    path: '/credit-union-branches/:branch_id',
    middleware: [attachPrincipal],
    operationId: 'directory-retrieve_credit_union_branch',
    summary: docs.RETRIEVE_CREDIT_UNION_BRANCH_SUMMARY,
    description: docs.RETRIEVE_CREDIT_UNION_BRANCH_DESCRIPTION,
    request: {
      params: branchIdParamsSchema,
      query: retrieveDirectoryQuerySchema,
    },
    responses: {
      200: {
        description: 'Credit union branch returned.',
        schema: creditUnionBranchSchema,
      },
      404: { description: 'Credit union branch not found.' },
    },
    handler: controller.retrieveCreditUnionBranch,
  })

  api.post({
    path: '/credit-unions/:credit_union_id/branches',
    security: 'admin',
    operationId: 'directory-create_credit_union_branch',
    summary: docs.CREATE_CREDIT_UNION_BRANCH_SUMMARY,
    description: docs.CREATE_CREDIT_UNION_BRANCH_DESCRIPTION,
    request: {
      params: creditUnionIdParamsSchema,
      body: creditUnionBranchCreateSchema,
    },
    responses: {
      201: {
        description: 'Credit union branch created.',
        schema: creditUnionBranchSchema,
      },
      404: { description: 'Credit union not found.' },
    },
    handler: controller.createCreditUnionBranch,
  })

  api.patch({
    path: '/credit-union-branches/:branch_id',
    security: 'admin',
    operationId: 'directory-update_credit_union_branch',
    summary: docs.UPDATE_CREDIT_UNION_BRANCH_SUMMARY,
    description: docs.UPDATE_CREDIT_UNION_BRANCH_DESCRIPTION,
    request: {
      params: branchIdParamsSchema,
      body: creditUnionBranchUpdateSchema,
    },
    responses: {
      200: {
        description: 'Credit union branch updated.',
        schema: creditUnionBranchSchema,
      },
      404: { description: 'Credit union branch not found.' },
    },
    handler: controller.updateCreditUnionBranch,
  })

  api.delete({
    path: '/credit-union-branches/:branch_id',
    security: 'admin',
    operationId: 'directory-delete_credit_union_branch',
    summary: docs.DELETE_CREDIT_UNION_BRANCH_SUMMARY,
    description: docs.DELETE_CREDIT_UNION_BRANCH_DESCRIPTION,
    request: { params: branchIdParamsSchema },
    responses: {
      200: {
        description: 'Credit union branch deleted.',
        schema: creditUnionBranchDeletedSchema,
      },
      404: { description: 'Credit union branch not found.' },
    },
    handler: controller.deleteCreditUnionBranch,
  })

  // --- Bank accounts ---

  api.get({
    path: '/bank-accounts',
    middleware: [attachPrincipal],
    operationId: 'directory-list_bank_accounts',
    summary: docs.LIST_BANK_ACCOUNTS_SUMMARY,
    description: docs.LIST_BANK_ACCOUNTS_DESCRIPTION,
    request: { query: listDirectoryQuerySchema },
    responses: {
      200: {
        description: 'Bank account list returned.',
        schema: listObjectSchema(bankAccountSchema),
      },
    },
    handler: controller.listBankAccounts,
  })

  api.get({
    path: '/bank-accounts/:account_id',
    middleware: [attachPrincipal],
    operationId: 'directory-retrieve_bank_account',
    summary: docs.RETRIEVE_BANK_ACCOUNT_SUMMARY,
    description: docs.RETRIEVE_BANK_ACCOUNT_DESCRIPTION,
    request: {
      params: accountIdParamsSchema,
      query: retrieveDirectoryQuerySchema,
    },
    responses: {
      200: {
        description: 'Bank account returned.',
        schema: bankAccountSchema,
      },
      404: { description: 'Bank account not found.' },
    },
    handler: controller.retrieveBankAccount,
  })

  api.post({
    path: '/bank-accounts',
    security: 'admin',
    operationId: 'directory-create_bank_account',
    summary: docs.CREATE_BANK_ACCOUNT_SUMMARY,
    description: docs.CREATE_BANK_ACCOUNT_DESCRIPTION,
    request: { body: bankAccountCreateSchema },
    responses: {
      201: {
        description: 'Bank account created.',
        schema: bankAccountSchema,
      },
      404: { description: 'Bank or bank branch not found.' },
    },
    handler: controller.createBankAccount,
  })

  api.patch({
    path: '/bank-accounts/:account_id',
    security: 'admin',
    operationId: 'directory-update_bank_account',
    summary: docs.UPDATE_BANK_ACCOUNT_SUMMARY,
    description: docs.UPDATE_BANK_ACCOUNT_DESCRIPTION,
    request: { params: accountIdParamsSchema, body: bankAccountUpdateSchema },
    responses: {
      200: {
        description: 'Bank account updated.',
        schema: bankAccountSchema,
      },
      404: { description: 'Bank account not found.' },
    },
    handler: controller.updateBankAccount,
  })

  api.delete({
    path: '/bank-accounts/:account_id',
    security: 'admin',
    operationId: 'directory-delete_bank_account',
    summary: docs.DELETE_BANK_ACCOUNT_SUMMARY,
    description: docs.DELETE_BANK_ACCOUNT_DESCRIPTION,
    request: { params: accountIdParamsSchema },
    responses: {
      200: {
        description: 'Bank account deleted.',
        schema: bankAccountDeletedSchema,
      },
      404: { description: 'Bank account not found.' },
    },
    handler: controller.deleteBankAccount,
  })

  return api.router
}
