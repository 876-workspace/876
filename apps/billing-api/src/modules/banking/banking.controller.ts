import type { Request, Response } from 'express'
import { getPrincipal } from '@/http/auth'
import { validBody, validParams } from '@/http/middleware/validate'
import type {
  BankAccountCreateBody,
  BankAccountUpdateBody,
  BankTransactionCreateBody,
  BankTransactionUpdateBody,
} from './banking.schemas'
import {
  createBankAccount,
  createBankTransaction,
  deleteBankAccount,
  deleteBankTransaction,
  listBankAccounts,
  listBankTransactions,
  retrieveBankAccount,
  retrieveBankTransaction,
  updateBankAccount,
  updateBankTransaction,
} from './banking.service'
function tenant(req: Request) {
  const id = getPrincipal(req).tenantId
  if (!id) throw new Error('Tenant guard did not resolve a tenant.')
  return id
}
function account(req: Request) {
  return validParams<{ accountId: string }>(req).accountId
}
function transaction(req: Request) {
  return validParams<{ accountId: string; transactionId: string }>(req)
}
export const bankingController = {
  async listAccounts(req: Request, res: Response) {
    res.json(await listBankAccounts(tenant(req)))
  },
  async createAccount(req: Request, res: Response) {
    res
      .status(201)
      .json(
        await createBankAccount(
          tenant(req),
          validBody<BankAccountCreateBody>(req)
        )
      )
  },
  async retrieveAccount(req: Request, res: Response) {
    res.json(await retrieveBankAccount(tenant(req), account(req)))
  },
  async updateAccount(req: Request, res: Response) {
    res.json(
      await updateBankAccount(
        tenant(req),
        account(req),
        validBody<BankAccountUpdateBody>(req)
      )
    )
  },
  async deleteAccount(req: Request, res: Response) {
    res.json(await deleteBankAccount(tenant(req), account(req)))
  },
  async listTransactions(req: Request, res: Response) {
    res.json(await listBankTransactions(tenant(req), account(req)))
  },
  async createTransaction(req: Request, res: Response) {
    res
      .status(201)
      .json(
        await createBankTransaction(
          tenant(req),
          account(req),
          validBody<BankTransactionCreateBody>(req)
        )
      )
  },
  async retrieveTransaction(req: Request, res: Response) {
    const ids = transaction(req)
    res.json(
      await retrieveBankTransaction(
        tenant(req),
        ids.accountId,
        ids.transactionId
      )
    )
  },
  async updateTransaction(req: Request, res: Response) {
    const ids = transaction(req)
    res.json(
      await updateBankTransaction(
        tenant(req),
        ids.accountId,
        ids.transactionId,
        validBody<BankTransactionUpdateBody>(req)
      )
    )
  },
  async deleteTransaction(req: Request, res: Response) {
    const ids = transaction(req)
    res.json(
      await deleteBankTransaction(tenant(req), ids.accountId, ids.transactionId)
    )
  },
}
