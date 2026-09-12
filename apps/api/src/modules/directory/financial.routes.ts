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
  bankListQuerySchema,
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
    request: { query: bankListQuerySchema },
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
    request: { params: bankIdParamsSchema, query: retrieveDirectoryQuerySchema },
    responses: {
      200: { description: 'Bank returned.', schema: bankSchema },
    },
    handler: controller.retrieveBank,
  })

  api.post({
    path: '/banks',
    middleware: [attachPrincipal],
    operationId: 'directory-create_bank',
    summary: docs.CREATE_BANK_SUMMARY,
    description: docs.CREATE_BANK_DESCRIPTION,
    security: 'admin',
    request: { body: bankCreateSchema },
    responses: {
      201: { description: 'Bank created.', schema: bankSchema },
    },
    handler: controller.createBank,
  })

  api.patch({
    path: '/banks/:bank_id',
    middleware: [attachPrincipal],
    operationId: 'directory-update_bank',
    summary: docs.UPDATE_BANK_SUMMARY,
    description: docs.UPDATE_BANK_DESCRIPTION,
    security: 'admin',
    request: { params: bankIdParamsSchema, body: bankUpdateSchema },
    responses: {
      200: { description: 'Bank updated.', schema: bankSchema },
    },
    handler: controller.updateBank,
  })

  api.delete({
    path: '/banks/:bank_id',
    middleware: [attachPrincipal],
    operationId: 'directory-delete_bank',
    summary: docs.DELETE_BANK_SUMMARY,
    description: docs.DELETE_BANK_DESCRIPTION,
    security: 'admin',
    request: { params: bankIdParamsSchema },
    responses: {
      200: { description: 'Bank deleted.', schema: bankDeletedSchema },
    },
    handler: controller.deleteBank,
  })

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
    },
    handler: controller.listBankBranches,
  })

  api.post({
    path: '/banks/:bank_id/branches',
    middleware: [attachPrincipal],
    operationId: 'directory-create_bank_branch',
    summary: docs.CREATE_BANK_BRANCH_SUMMARY,
    description: docs.CREATE_BANK_BRANCH_DESCRIPTION,
    security: 'admin',
    request: { params: bankIdParamsSchema, body: bankBranchCreateSchema },
    responses: {
      201: { description: 'Bank branch created.', schema: bankBranchSchema },
    },
    handler: controller.createBankBranch,
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
      200: { description: 'Bank branch returned.', schema: bankBranchSchema },
    },
    handler: controller.retrieveBankBranch,
  })

  api.patch({
    path: '/bank-branches/:branch_id',
    middleware: [attachPrincipal],
    operationId: 'directory-update_bank_branch',
    summary: docs.UPDATE_BANK_BRANCH_SUMMARY,
    description: docs.UPDATE_BANK_BRANCH_DESCRIPTION,
    security: 'admin',
    request: { params: branchIdParamsSchema, body: bankBranchUpdateSchema },
    responses: {
      200: { description: 'Bank branch updated.', schema: bankBranchSchema },
    },
    handler: controller.updateBankBranch,
  })

  api.delete({
    path: '/bank-branches/:branch_id',
    middleware: [attachPrincipal],
    operationId: 'directory-delete_bank_branch',
    summary: docs.DELETE_BANK_BRANCH_SUMMARY,
    description: docs.DELETE_BANK_BRANCH_DESCRIPTION,
    security: 'admin',
    request: { params: branchIdParamsSchema },
    responses: {
      200: { description: 'Bank branch deleted.', schema: bankBranchDeletedSchema },
    },
    handler: controller.deleteBankBranch,
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
      200: { description: 'Bank account returned.', schema: bankAccountSchema },
    },
    handler: controller.retrieveBankAccount,
  })

  api.post({
    path: '/bank-accounts',
    middleware: [attachPrincipal],
    operationId: 'directory-create_bank_account',
    summary: docs.CREATE_BANK_ACCOUNT_SUMMARY,
    description: docs.CREATE_BANK_ACCOUNT_DESCRIPTION,
    security: 'admin',
    request: { body: bankAccountCreateSchema },
    responses: {
      201: { description: 'Bank account created.', schema: bankAccountSchema },
    },
    handler: controller.createBankAccount,
  })

  api.patch({
    path: '/bank-accounts/:account_id',
    middleware: [attachPrincipal],
    operationId: 'directory-update_bank_account',
    summary: docs.UPDATE_BANK_ACCOUNT_SUMMARY,
    description: docs.UPDATE_BANK_ACCOUNT_DESCRIPTION,
    security: 'admin',
    request: { params: accountIdParamsSchema, body: bankAccountUpdateSchema },
    responses: {
      200: { description: 'Bank account updated.', schema: bankAccountSchema },
    },
    handler: controller.updateBankAccount,
  })

  api.delete({
    path: '/bank-accounts/:account_id',
    middleware: [attachPrincipal],
    operationId: 'directory-delete_bank_account',
    summary: docs.DELETE_BANK_ACCOUNT_SUMMARY,
    description: docs.DELETE_BANK_ACCOUNT_DESCRIPTION,
    security: 'admin',
    request: { params: accountIdParamsSchema },
    responses: {
      200: { description: 'Bank account deleted.', schema: bankAccountDeletedSchema },
    },
    handler: controller.deleteBankAccount,
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

  api.post({
    path: '/credit-unions',
    middleware: [attachPrincipal],
    operationId: 'directory-create_credit_union',
    summary: docs.CREATE_CREDIT_UNION_SUMMARY,
    description: docs.CREATE_CREDIT_UNION_DESCRIPTION,
    security: 'admin',
    request: { body: creditUnionCreateSchema },
    responses: {
      201: { description: 'Credit union created.', schema: creditUnionSchema },
    },
    handler: controller.createCreditUnion,
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
      200: { description: 'Credit union returned.', schema: creditUnionSchema },
    },
    handler: controller.retrieveCreditUnion,
  })

  api.patch({
    path: '/credit-unions/:credit_union_id',
    middleware: [attachPrincipal],
    operationId: 'directory-update_credit_union',
    summary: docs.UPDATE_CREDIT_UNION_SUMMARY,
    description: docs.UPDATE_CREDIT_UNION_DESCRIPTION,
    security: 'admin',
    request: { params: creditUnionIdParamsSchema, body: creditUnionUpdateSchema },
    responses: {
      200: { description: 'Credit union updated.', schema: creditUnionSchema },
    },
    handler: controller.updateCreditUnion,
  })

  api.delete({
    path: '/credit-unions/:credit_union_id',
    middleware: [attachPrincipal],
    operationId: 'directory-delete_credit_union',
    summary: docs.DELETE_CREDIT_UNION_SUMMARY,
    description: docs.DELETE_CREDIT_UNION_DESCRIPTION,
    security: 'admin',
    request: { params: creditUnionIdParamsSchema },
    responses: {
      200: {
        description: 'Credit union deleted.',
        schema: creditUnionDeletedSchema,
      },
    },
    handler: controller.deleteCreditUnion,
  })

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
    },
    handler: controller.listCreditUnionBranches,
  })

  api.post({
    path: '/credit-unions/:credit_union_id/branches',
    middleware: [attachPrincipal],
    operationId: 'directory-create_credit_union_branch',
    summary: docs.CREATE_CREDIT_UNION_BRANCH_SUMMARY,
    description: docs.CREATE_CREDIT_UNION_BRANCH_DESCRIPTION,
    security: 'admin',
    request: {
      params: creditUnionIdParamsSchema,
      body: creditUnionBranchCreateSchema,
    },
    responses: {
      201: {
        description: 'Credit union branch created.',
        schema: creditUnionBranchSchema,
      },
    },
    handler: controller.createCreditUnionBranch,
  })

  return api.router
}
