import type { Request, Response } from 'express'

import { getPrincipal } from '@/http/auth'
import { validBody, validParams } from '@/http/middleware/validate'

import * as service from './banking-engine.service'
import type {
  BankRuleCreateBody,
  BankRuleUpdateBody,
  BankTransferCreateBody,
  ReconciliationCreateBody,
  StatementCategorizeBody,
  StatementImportCreateBody,
  StatementMatchBody,
} from './banking-engine.schemas'

function tenantId(req: Request): string {
  const tenantId = getPrincipal(req).tenantId
  if (!tenantId) throw new Error('Tenant guard did not resolve a tenant.')

  return tenantId
}

function actorId(req: Request): string | null {
  return getPrincipal(req).userId
}

export const bankingEngineController = {
  async listStatementImports(req: Request, res: Response) {
    const { accountId } = validParams<{ accountId: string }>(req)
    res.json(await service.listStatementImports(tenantId(req), accountId))
  },

  async createStatementImport(req: Request, res: Response) {
    const { accountId } = validParams<{ accountId: string }>(req)
    res.status(201).json(
      await service.createStatementImport(
        tenantId(req),
        accountId,
        validBody<StatementImportCreateBody>(req),
        actorId(req)
      )
    )
  },

  async retrieveStatementImport(req: Request, res: Response) {
    const { importId } = validParams<{ importId: string }>(req)
    res.json(await service.retrieveStatementImport(tenantId(req), importId))
  },

  async undoStatementImport(req: Request, res: Response) {
    const { importId } = validParams<{ importId: string }>(req)
    res.json(await service.undoStatementImport(tenantId(req), importId))
  },

  async listStatementLines(req: Request, res: Response) {
    const { accountId } = validParams<{ accountId: string }>(req)
    res.json(await service.listStatementLines(tenantId(req), accountId))
  },

  async retrieveStatementLine(req: Request, res: Response) {
    const { lineId } = validParams<{ lineId: string }>(req)
    res.json(await service.retrieveStatementLine(tenantId(req), lineId))
  },

  async listMatchCandidates(req: Request, res: Response) {
    const { lineId } = validParams<{ lineId: string }>(req)
    res.json(await service.listMatchCandidates(tenantId(req), lineId))
  },

  async matchStatementLine(req: Request, res: Response) {
    const { lineId } = validParams<{ lineId: string }>(req)
    res.status(201).json(
      await service.matchStatementLine(
        tenantId(req),
        lineId,
        validBody<StatementMatchBody>(req),
        actorId(req)
      )
    )
  },

  async unmatchStatementLine(req: Request, res: Response) {
    const { lineId } = validParams<{ lineId: string }>(req)
    res.json(
      await service.unmatchStatementLine(tenantId(req), lineId, actorId(req))
    )
  },

  async categorizeStatementLine(req: Request, res: Response) {
    const { lineId } = validParams<{ lineId: string }>(req)
    const body = validBody<StatementCategorizeBody>(req)
    res.status(201).json(
      await service.categorizeManualStatementLine(
        tenantId(req),
        lineId,
        body.action,
        actorId(req)
      )
    )
  },

  async excludeStatementLine(req: Request, res: Response) {
    const { lineId } = validParams<{ lineId: string }>(req)
    res.json(await service.excludeStatementLine(tenantId(req), lineId))
  },

  async restoreStatementLine(req: Request, res: Response) {
    const { lineId } = validParams<{ lineId: string }>(req)
    res.json(await service.restoreStatementLine(tenantId(req), lineId))
  },

  async listTransfers(req: Request, res: Response) {
    res.json(await service.listBankTransfers(tenantId(req)))
  },

  async createTransfer(req: Request, res: Response) {
    res.status(201).json(
      await service.createBankTransfer(
        tenantId(req),
        validBody<BankTransferCreateBody>(req)
      )
    )
  },

  async listReconciliations(req: Request, res: Response) {
    const { accountId } = validParams<{ accountId: string }>(req)
    res.json(await service.listReconciliations(tenantId(req), accountId))
  },

  async createReconciliation(req: Request, res: Response) {
    const { accountId } = validParams<{ accountId: string }>(req)
    res.status(201).json(
      await service.createReconciliation(
        tenantId(req),
        accountId,
        validBody<ReconciliationCreateBody>(req),
        actorId(req)
      )
    )
  },

  async retrieveReconciliation(req: Request, res: Response) {
    const { reconciliationId } = validParams<{ reconciliationId: string }>(req)
    res.json(
      await service.retrieveReconciliation(tenantId(req), reconciliationId)
    )
  },

  async completeReconciliation(req: Request, res: Response) {
    const { reconciliationId } = validParams<{ reconciliationId: string }>(req)
    res.json(
      await service.completeReconciliation(
        tenantId(req),
        reconciliationId,
        actorId(req)
      )
    )
  },

  async reopenReconciliation(req: Request, res: Response) {
    const { reconciliationId } = validParams<{ reconciliationId: string }>(req)
    res.json(
      await service.reopenReconciliation(
        tenantId(req),
        reconciliationId,
        actorId(req)
      )
    )
  },

  async listRules(req: Request, res: Response) {
    res.json(await service.listBankRules(tenantId(req)))
  },

  async createRule(req: Request, res: Response) {
    res.status(201).json(
      await service.createBankRule(
        tenantId(req),
        validBody<BankRuleCreateBody>(req),
        actorId(req)
      )
    )
  },

  async retrieveRule(req: Request, res: Response) {
    const { ruleId } = validParams<{ ruleId: string }>(req)
    res.json(await service.retrieveBankRule(tenantId(req), ruleId))
  },

  async updateRule(req: Request, res: Response) {
    const { ruleId } = validParams<{ ruleId: string }>(req)
    res.json(
      await service.updateBankRule(
        tenantId(req),
        ruleId,
        validBody<BankRuleUpdateBody>(req)
      )
    )
  },

  async deleteRule(req: Request, res: Response) {
    const { ruleId } = validParams<{ ruleId: string }>(req)
    res.json(await service.deleteBankRule(tenantId(req), ruleId))
  },
}
