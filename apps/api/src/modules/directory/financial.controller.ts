/**
 * Read validated input, call one service function, pick a status code.
 *
 * The one judgement here is reading `principal.internal` and handing it to the
 * service: the tombstone gate needs the caller's privilege, and the principal is
 * only reachable from the request.
 */

import type { Request, Response } from 'express'

import { getPrincipal } from '@/http/auth/principal'
import { validBody, validParams, validQuery } from '@/http/middleware/validate'

import type {
  ListDirectoryQuery,
  RetrieveDirectoryQuery,
} from './directory.schemas'
import type {
  BankAccountCreate,
  BankAccountUpdate,
  BankBranchCreate,
  BankBranchUpdate,
  BankCreate,
  BankUpdate,
  CreditUnionBranchCreate,
  CreditUnionBranchUpdate,
  CreditUnionCreate,
  CreditUnionUpdate,
} from './financial.schemas'
import * as service from './financial.service'

function isInternal(req: Request): boolean {
  return getPrincipal(req).internal
}

function actor(req: Request): string | null {
  return getPrincipal(req).userId
}

// --- Banks ---

export async function listBanks(req: Request, res: Response): Promise<void> {
  const query = validQuery<ListDirectoryQuery>(req)

  res.status(200).json(await service.listBanks(query, isInternal(req)))
}

export async function retrieveBank(req: Request, res: Response): Promise<void> {
  const { bank_id } = validParams<{ bank_id: string }>(req)
  const query = validQuery<RetrieveDirectoryQuery>(req)

  res
    .status(200)
    .json(await service.retrieveBank(bank_id, query, isInternal(req)))
}

export async function createBank(req: Request, res: Response): Promise<void> {
  const body = validBody<BankCreate>(req)

  res.status(201).json(await service.createBank(body))
}

export async function updateBank(req: Request, res: Response): Promise<void> {
  const { bank_id } = validParams<{ bank_id: string }>(req)
  const body = validBody<BankUpdate>(req)

  res.status(200).json(await service.updateBank(bank_id, body))
}

export async function deleteBank(req: Request, res: Response): Promise<void> {
  const { bank_id } = validParams<{ bank_id: string }>(req)

  res.status(200).json(await service.deleteBank(bank_id, actor(req)))
}

// --- Bank branches ---

export async function listBankBranches(
  req: Request,
  res: Response
): Promise<void> {
  const { bank_id } = validParams<{ bank_id: string }>(req)
  const query = validQuery<ListDirectoryQuery>(req)

  res
    .status(200)
    .json(await service.listBankBranches(bank_id, query, isInternal(req)))
}

export async function retrieveBankBranch(
  req: Request,
  res: Response
): Promise<void> {
  const { branch_id } = validParams<{ branch_id: string }>(req)
  const query = validQuery<RetrieveDirectoryQuery>(req)

  res
    .status(200)
    .json(await service.retrieveBankBranch(branch_id, query, isInternal(req)))
}

export async function createBankBranch(
  req: Request,
  res: Response
): Promise<void> {
  const { bank_id } = validParams<{ bank_id: string }>(req)
  const body = validBody<BankBranchCreate>(req)

  res.status(201).json(await service.createBankBranch(bank_id, body))
}

export async function updateBankBranch(
  req: Request,
  res: Response
): Promise<void> {
  const { branch_id } = validParams<{ branch_id: string }>(req)
  const body = validBody<BankBranchUpdate>(req)

  res.status(200).json(await service.updateBankBranch(branch_id, body))
}

export async function deleteBankBranch(
  req: Request,
  res: Response
): Promise<void> {
  const { branch_id } = validParams<{ branch_id: string }>(req)

  res.status(200).json(await service.deleteBankBranch(branch_id, actor(req)))
}

// --- Bank accounts ---

export async function listBankAccounts(
  req: Request,
  res: Response
): Promise<void> {
  const query = validQuery<ListDirectoryQuery>(req)

  res.status(200).json(await service.listBankAccounts(query, isInternal(req)))
}

export async function retrieveBankAccount(
  req: Request,
  res: Response
): Promise<void> {
  const { account_id } = validParams<{ account_id: string }>(req)
  const query = validQuery<RetrieveDirectoryQuery>(req)

  res
    .status(200)
    .json(await service.retrieveBankAccount(account_id, query, isInternal(req)))
}

export async function createBankAccount(
  req: Request,
  res: Response
): Promise<void> {
  const body = validBody<BankAccountCreate>(req)

  res.status(201).json(await service.createBankAccount(body))
}

export async function updateBankAccount(
  req: Request,
  res: Response
): Promise<void> {
  const { account_id } = validParams<{ account_id: string }>(req)
  const body = validBody<BankAccountUpdate>(req)

  res.status(200).json(await service.updateBankAccount(account_id, body))
}

export async function deleteBankAccount(
  req: Request,
  res: Response
): Promise<void> {
  const { account_id } = validParams<{ account_id: string }>(req)

  res.status(200).json(await service.deleteBankAccount(account_id, actor(req)))
}

// --- Credit unions ---

export async function listCreditUnions(
  req: Request,
  res: Response
): Promise<void> {
  const query = validQuery<ListDirectoryQuery>(req)

  res.status(200).json(await service.listCreditUnions(query, isInternal(req)))
}

export async function retrieveCreditUnion(
  req: Request,
  res: Response
): Promise<void> {
  const { credit_union_id } = validParams<{ credit_union_id: string }>(req)
  const query = validQuery<RetrieveDirectoryQuery>(req)

  res
    .status(200)
    .json(
      await service.retrieveCreditUnion(credit_union_id, query, isInternal(req))
    )
}

export async function createCreditUnion(
  req: Request,
  res: Response
): Promise<void> {
  const body = validBody<CreditUnionCreate>(req)

  res.status(201).json(await service.createCreditUnion(body))
}

export async function updateCreditUnion(
  req: Request,
  res: Response
): Promise<void> {
  const { credit_union_id } = validParams<{ credit_union_id: string }>(req)
  const body = validBody<CreditUnionUpdate>(req)

  res.status(200).json(await service.updateCreditUnion(credit_union_id, body))
}

export async function deleteCreditUnion(
  req: Request,
  res: Response
): Promise<void> {
  const { credit_union_id } = validParams<{ credit_union_id: string }>(req)

  res
    .status(200)
    .json(await service.deleteCreditUnion(credit_union_id, actor(req)))
}

// --- Credit union branches ---

export async function listCreditUnionBranches(
  req: Request,
  res: Response
): Promise<void> {
  const { credit_union_id } = validParams<{ credit_union_id: string }>(req)
  const query = validQuery<ListDirectoryQuery>(req)

  res
    .status(200)
    .json(
      await service.listCreditUnionBranches(
        credit_union_id,
        query,
        isInternal(req)
      )
    )
}

export async function retrieveCreditUnionBranch(
  req: Request,
  res: Response
): Promise<void> {
  const { branch_id } = validParams<{ branch_id: string }>(req)
  const query = validQuery<RetrieveDirectoryQuery>(req)

  res
    .status(200)
    .json(
      await service.retrieveCreditUnionBranch(branch_id, query, isInternal(req))
    )
}

export async function createCreditUnionBranch(
  req: Request,
  res: Response
): Promise<void> {
  const { credit_union_id } = validParams<{ credit_union_id: string }>(req)
  const body = validBody<CreditUnionBranchCreate>(req)

  res
    .status(201)
    .json(await service.createCreditUnionBranch(credit_union_id, body))
}

export async function updateCreditUnionBranch(
  req: Request,
  res: Response
): Promise<void> {
  const { branch_id } = validParams<{ branch_id: string }>(req)
  const body = validBody<CreditUnionBranchUpdate>(req)

  res.status(200).json(await service.updateCreditUnionBranch(branch_id, body))
}

export async function deleteCreditUnionBranch(
  req: Request,
  res: Response
): Promise<void> {
  const { branch_id } = validParams<{ branch_id: string }>(req)

  res
    .status(200)
    .json(await service.deleteCreditUnionBranch(branch_id, actor(req)))
}
